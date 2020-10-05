export default class WinScreen {
    constructor(block_container) {
        this.block_container = block_container;
        this.level_done = null;  // level succeeded.
        this.reject = null;  // level crashed
    }

    start() {
        const info_block = this.block_container
            .append('block')
            .classed('title-screen', true)
        info_block.append('h1').text('You Win!')
        info_block.append('pre').text(`
            Made by DomNomNom in a rush.
        `)
        const navigation = info_block.append('div')
        navigation.append('a')
            .text('Back')
            .attr('href', '#')
            .on('click', () => this.level_done(-1))
        navigation.append('span').text(' ')

        return new Promise((level_done, reject) => {
            this.level_done = level_done;
            this.reject = reject;
        })
    }
}
