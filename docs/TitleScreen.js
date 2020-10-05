export default class TitleScreen {
    constructor(block_container) {
        this.block_container = block_container;
        this.level_done = null;  // level succeeded.
        this.reject = null;  // level crashed
    }

    start() {
        const info_block = this.block_container
            .append('block')
            .classed('title-screen', true)
        info_block.append('h1').text('Training Loop')
        info_block.append('pre').text(`
            Welcome dear neural network!
            Your job is tweak the parameters of the policy.
            To gain great rewards,
            you must learn in the ~training loop~
        `)
        const navigation = info_block.append('div')
        navigation.append('a')
            .text('Next')
            .attr('href', '#')
            .on('click', () => this.level_done(+1))

        return new Promise((level_done, reject) => {
            this.level_done = level_done;
            this.reject = reject;
        })
    }
}
