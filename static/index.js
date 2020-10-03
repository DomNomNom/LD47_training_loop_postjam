import Level1 from "./level1.js";

async function main() {

    const block_container = d3.select('#block-container');
    let level = new Level1(block_container);
    await level.start();
}

main();
