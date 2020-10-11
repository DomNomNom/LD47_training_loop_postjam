import TitleScreen from "./TitleScreen.js";
import Level1 from "./level1.js";
import Level2 from "./level2.js";
import WinScreen from "./WinScreen.js";

async function main() {
    const block_container = d3.select('#block-container');
    const levels = [
        new Level2(block_container),
        new TitleScreen(block_container),
        new Level1(block_container),
        new WinScreen(block_container),
    ]
    let level_index = 0;

    while (true) {
        const level = levels[level_index];
        console.log('starting level:', level);
        block_container.html('')
        level_index += await level.start();
    }
}

main();
