'use strict';

const WEB = typeof XMLHttpRequest !== 'undefined';
const DEFAULT_TREEMAP = 'vast.json';
const d3 = WEB ? window.d3 : require('d3');

async function makeTreeMap(jsonFilePath = DEFAULT_TREEMAP) {
  const margin = { top: 40, right: 10, bottom: 10, left: 10 };
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  const color = d3.scaleOrdinal().range(d3.schemeCategory20c);
  const treemap = d3.treemap().size([width, height]);

  const vastfile = await readJson(jsonFilePath);
  verifyVastFile(vastfile);

  const vast = vastfile.vast;
  adjustNodeSize(vast);
  if (WEB) console.log('vast:', vast);

  const root = d3.hierarchy(vast, (d) => d.children)
    .sum((d) => (d.size || 0) + (d.dsize || 0));
  if (WEB) console.log('root:', root);

  const tree = treemap(root);
  const tmapfile = generateTmapFile(tree, jsonFilePath);

  if (!WEB) {
    const tmapjson = JSON.stringify(tmapfile, null, 2);
    console.log(tmapjson);
    return;
  } else {
    console.log('treemap:', tmapfile);
  }

  const div = d3.select("body").append("div")
    .style("position", "relative")
    .style("width", (width + margin.left + margin.right) + "px")
    .style("height", (height + margin.top + margin.bottom) + "px")
    .style("left", margin.left + "px")
    .style("top", margin.top + "px");

  const node = div.datum(root).selectAll(".node")
    .data(tree.leaves())
    .enter().append("div")
    .attr("class", "node")
    .style("left", (d) => d.x0 + "px")
    .style("top", (d) => d.y0 + "px")
    .style("width", (d) => Math.max(0, d.x1 - d.x0 - 1) + "px")
    .style("height", (d) => Math.max(0, d.y1 - d.y0 - 1) + "px")
    .style("background", (d) => color(d.parent.data.name))
    .text((d) => d.data.name);

  d3.selectAll("input").on("change", function change() {
    const value = this.value === "count"
      ? (d) => { return d.size ? 1 : 0; }
      : (d) => { return d.size; };

    const newRoot = d3.hierarchy(vast, (d) => d.children)
      .sum(value);

    node.data(treemap(newRoot).leaves())
      .transition()
      .duration(1500)
      .style("left", (d) => d.x0 + "px")
      .style("top", (d) => d.y0 + "px")
      .style("width", (d) => Math.max(0, d.x1 - d.x0 - 1) + "px")
      .style("height", (d) => Math.max(0, d.y1 - d.y0 - 1) + "px")
  });
}

// This is to hijack d3.hierarchy().sum() so node.value = data.size || sum(...).
function adjustNodeSize(t) {
  let sum = 0;
  for (let node of t.children || [])
    sum += adjustNodeSize(node);
  if (t.size > 0)
    t.dsize = -sum;
  if (sum > t.size)
    console.warn('Node size is less than the sum of its children:', t.size, sum, t.name);
  return t.size || sum;
}

function generateTmapFile(tree, source) {
  return {
    type: 'tmap',
    version: '1.0.0',
    timestamp: new Date().toJSON(),
    source,
    treemap: cleanupTreemap(tree),
  };
}

function verifyVastFile(json) {
  if (json.format != 'vast' || json.version != '1.0.0')
    throw new Error('Invalid VAST');
}

function cleanupTreemap(t) {
  return {
    x0: t.x0,
    y0: t.y0,
    x1: t.x1,
    y1: t.y1,
    data: {
      name: t.data.name,
      type: t.data.type,
    },
    children: t.children &&
      t.children.map(cleanupTreemap),
  };
}

async function readJson(filepath) {
  if (WEB) {
    return await new Promise((resolve, reject) =>
      d3.json(filepath, (err, res) =>
        err ? reject(err) : resolve(res)))
  } else {
    const fs = require('fs');
    const json = await new Promise((resolve, reject) =>
      fs.readFile(filepath, 'utf8',
        (err, res) => err ? reject(err) : resolve(res)));
    return JSON.parse(json);
  }
}

makeTreeMap(WEB ? undefined : process.argv[2]);
