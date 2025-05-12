// src/network/networkController.js

const memoryStore = require("../data/memoryStore");
const User = require("../models/User");
const { MultiGraph } = require("graphology");
const randomLayout = require("graphology-layout/random");
const fs = require("fs");
const { exec } = require("child_process");

async function createNetwork(req, res) {
  try {
    const { userIds, model, numOfUsers, m } = req.body;

    if (!userIds || !model || !numOfUsers || m === undefined) {
      console.log("Missing required parameters.");
      return res.status(400).json({ message: "Missing required parameters." });
    }

    if (numOfUsers <= 0 || m < 0) {
      console.log("Invalid parameters: numOfUsers should be > 0 and m should be >= 0.");
      return res.status(400).json({ message: "Invalid parameters." });
    }

    if (userIds.length !== numOfUsers) {
      console.log("Mismatch between userIds and numOfUsers.");
      return res.status(400).json({ message: "Mismatch between userIds and numOfUsers." });
    }

    const graph = generateNetwork(userIds, model, numOfUsers, m);
    console.log("✅ Network successfully generated");

    const nodeIdToUserId = {};
    graph.nodes().forEach((node, i) => {
      nodeIdToUserId[node] = userIds[i];
    });

    const edges = graph.edges().map((edgeKey) => {
      const source = graph.source(edgeKey);
      const target = graph.target(edgeKey);

      const sourceId = nodeIdToUserId[source];
      const targetId = nodeIdToUserId[target];

      if (!sourceId || !targetId) {
        console.log(`Skipping invalid edge: ${source} -> ${target}`);
        return null;
      }

      return { source: sourceId, target: targetId };
    }).filter(Boolean);

    const updates = graph.edges().flatMap((edgeKey) => {
      const source = graph.source(edgeKey);
      const target = graph.target(edgeKey);
      const sourceId = nodeIdToUserId[source];
      const targetId = nodeIdToUserId[target];

      if (!sourceId || !targetId) {
        console.log(`Skipping update for invalid edge: ${sourceId} -> ${targetId}`);
        return [];
      }

      return [
        User.findByIdAndUpdate(sourceId, { $addToSet: { followings: targetId } }),
        User.findByIdAndUpdate(targetId, { $addToSet: { followers: sourceId } })
      ];
    });

    if (updates.length) {
      await Promise.all(updates);
      console.log("✅ Successfully updated users in DB");
    }

    const nodes = graph.nodes().map((node) => ({
      id: nodeIdToUserId[node],
      ...graph.getNodeAttributes(node),
    }));

    fs.writeFileSync("Analysis/network.dot", exportToDOT(graph));
    exec("dot -Tpng network.dot -o Analysis/network.png", (err) => {
      if (err) console.error("❌ Error generating PNG:", err);
      else console.log("✅ Graph saved as network.png");
    });

    res.status(200).json({ message: "Graph and DB updated", nodes, edges });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: "Server error", error: err.message || "Unknown error" });
  }
}

function generateNetwork(userIds, model, numOfUsers, m) {
  const graph = new MultiGraph();

  userIds.forEach((id, i) => graph.addNode(i.toString(), { _id: id }));

  switch (model) {
    case "Barabasi":
      for (let i = 1; i < numOfUsers; i++) {
        const existing = new Set();
        let attempts = 0;

        for (let j = 0; j < m; j++) {
          let target = Math.floor(Math.random() * i);
          while (target === i || existing.has(target)) {
            target = Math.floor(Math.random() * i);
            if (++attempts > 100) break;
          }
          if (attempts > 100) break;
          graph.addEdge(i.toString(), target.toString());
          existing.add(target);
        }
      }
      break;

    case "ErdosRenyi":
      for (let i = 0; i < numOfUsers; i++) {
        for (let j = 0; j < numOfUsers; j++) {
          if (i !== j && Math.random() < m / numOfUsers) {
            graph.addEdge(i.toString(), j.toString());
          }
        }
      }
      break;

    case "StochasticBlockModel":
      const sizes = [Math.floor(numOfUsers / 2), Math.ceil(numOfUsers / 2)];
      const probMatrix = [[0.1 * m, 0.02 * m], [0.02 * m, 0.1 * m]];

      for (let i = 0; i < sizes[0]; i++) {
        for (let j = sizes[0]; j < numOfUsers; j++) {
          if (Math.random() < probMatrix[0][1]) {
            graph.addEdge(i.toString(), j.toString());
          }
        }
      }

      for (let i = sizes[0]; i < numOfUsers; i++) {
        for (let j = 0; j < sizes[0]; j++) {
          if (Math.random() < probMatrix[1][0]) {
            graph.addEdge(i.toString(), j.toString());
          }
        }
      }
      break;

    default:
      throw new Error("Invalid model type");
  }

  randomLayout.assign(graph);
  return graph;
}

function exportToDOT(graph) {
  let dot = "graph G {\n";
  graph.forEachEdge((edge, _, source, target) => {
    dot += `  "${source}" -- "${target}";\n`;
  });
  return dot + "}";
}

module.exports = { createNetwork };  // <-- Change this line
