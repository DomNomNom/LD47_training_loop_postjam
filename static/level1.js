export default class Level1 {
    constructor(block_container) {
        this.block_container = block_container;
        this.level_done = null;  // level succeeded.
        this.reject = null;  // level crashed
    }

    start() {
        const envs = this.block_container.selectAll('.environment')
            .data([
                {id: 1, theta: 1},
                {id: 2, theta: 2},
            ], d => d.id);

        envs.enter().append("block")
            .text(d => `theta=${d.theta}`)

        // debugger
        return new Promise((level_done, reject) => {
            this.level_done = level_done;
            this.reject = reject;
        })
    }
}
