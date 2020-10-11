import {PendulumEnv} from "./environments.js"
import {EvaluatorLevel} from './evaluators.js'

import {clip} from "./utils.js"


function policy(observation, p) {
    const {theta, theta_dot} = observation;

    let torque = (
        p('theta_weight') * theta +
        p('theta_dot_weight') * theta_dot
    );

    // The output action is torque with bounded strength
    return clip(torque, -2, 2);
}


const level_info = `
    This scenario rewards you for adjusting parameters to keep the paddle upright,
    using as little torque as necessary.
    There is no strict win condition, (~-520 is good) try to find some interesting states.
`;

export default class Level1 {
    constructor(block_container) {
        this.eval_level = new EvaluatorLevel({
            block_container,
            policy,
            env_class: PendulumEnv,
            level_name: 'Level 1',
            level_info,
            num_ticks: 100,
        })
    }

    async start() {
        return await this.eval_level.start()
    }
}
