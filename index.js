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

  const data = await readJson(jsonFilePath);

  const root = d3.hierarchy(data, (d) => d.children)
    .sum((d) => d.size);

  const tree = treemap(root);
  console.log(
    JSON.stringify(
      serializeTreemap(tree), null, 2));
  if (!WEB) return;

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

    const newRoot = d3.hierarchy(data, (d) => d.children)
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

function serializeTreemap(t) {
  return {
    x0: t.x0,
    y0: t.y0,
    x1: t.x1,
    y1: t.y1,
    children: t.children && t.children.map(serializeTreemap),
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
