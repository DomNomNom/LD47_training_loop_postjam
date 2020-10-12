import {PendulumEnv} from "./environments.js"
import {EvaluatorLevel} from './evaluators.js'

import {clip} from "./utils.js"



function policy({x, y, theta_dot}, p, log) {
    // Build conditions and potential output
    let conditions = [], torques = [];
    for (let i=0; i<3; ++i) {
        conditions.push(  // true iff cond < bias
            x * p(`x cond (${i})`) +
            y * p(`y cond (${i})`) +
            theta_dot * p(`theta. cond (${i})`)
            <
            p(`bias (${i})`)
        );
        torques.push(
            x * p(`x torque (${i})`) +
            y * p(`y torque (${i})`) +
            theta_dot * p(`theta. torque (${i})`)
        );
    }

    log({conditions, torques});

    // Select the first torque where the condition matches
    for (let i=0; i<3; ++i) {
        if (conditions[i]) return clip(torques[i], -2, 2);
    }
    return 0;  // Do nothing if no condition was met
}



const level_info = `
    Now try to do better with a bigger model!
    In this policy we have a choose select the first condition that matches
    and then apply torque based on some additional parameters.
    if we had x=.1 and y=.99, then that would be a state where the paddle is near-vertical up, leaning slightly right.
    Try beating the developer-score of -280.
`;

export default class Level2 {
    constructor(block_container) {
        this.eval_level = new EvaluatorLevel({
            block_container,
            policy,
            env_class: PendulumEnv,
            level_name: 'Level 2',
            level_info,
            num_ticks: 100,
        })
    }

    async start() {
        return await this.eval_level.start()
    }
}

/*

// debugger
class Environment {
    constructor(seed) {
        const rng = new Random(seed);
        this.theta = TAU * rng.uniform01();
        this.theta_dot = rng.uniform01();

        this.max_speed = 8
        this.max_torque = 2.
        this.dt = .04
        this.g = 10
        this.m = 1
        this.l = 1
        this.last_torque = 0
    }

    step(torque) {
        // this.theta_dot += action * dt;
        // this.theta += this.theta_dot * dt;
        // return 1;
        // dt = this.dt
        let {theta, theta_dot, g, m, l, dt} = this;

        torque = clip(torque, -this.max_torque, this.max_torque)
        this.last_torque = torque;
        let costs = angle_normalize(theta) ** 2 + .1 * theta_dot ** 2 + .001 * (torque ** 2)

        let newthdot = theta_dot + (-3 * g / (2 * l) * sin(theta + PI) + 3. / (m * l ** 2) * torque) * dt
        let newth = theta + newthdot * dt
        newthdot = clip(newthdot, -this.max_speed, this.max_speed)

        this.theta = angle_normalize(newth)
        this.theta_dot = newthdot
        return -costs
    }

    make_observation() {
        return {
            theta: this.theta,
            theta_dot: this.theta_dot,
            x: sin(this.theta),
            y: cos(this.theta),
        };
    }
}

const max_steps = 100;
export function average_total_reward(seeds, params) {
    const p = param_name => params[param_name];
    const rewards = seeds.map(seed => {
        const env = new Environment(seed);
        let total_reward = 0;
        for (let i=0; i<max_steps; ++i) {
            const action = policy(env.make_observation(), p);
            total_reward += env.step(action);
        }
        return total_reward;
    });
    return sum(rewards) / rewards.length;
}

export default class Level2 {
    constructor(block_container) {
        this.block_container = block_container;
        this.level_done = null;  // level succeeded.
        this.reject = null;  // level crashed
    }

    start() {
        this.block_container.html('')

        const rng = new Random("lots of apples");
        let num_envs = 6;
        let rewards = [];
        let metas = [];  // { env, total_reward, seed }
        function new_meta() {
            const seed = rng.int32().toString(16).padStart(8, '0');
            return {
                seed,
                env: new Environment(seed),
                total_reward: 0,
                ticks: 0,
            };
        }

        const params = []; // keys to params in insertion order.
        const param_name_to_index = {};
        const p = param_name => params[param_name_to_index[param_name]].val;
        {   // Initialize params via a single trace call.
            const trace_env = new Environment("YAAA");
            const trace_p = (param_name) => {
                const i = params.length
                param_name_to_index[param_name] = i;
                params.push({i, name: param_name, val: 0});
                return p(param_name);
            }
            trace_p('num_simulations'); params[params.length-1].val = num_envs;
            policy(trace_env.make_observation(), trace_p);
        }

        // updates the metasmodel one step (all envs)
        function physics_step() {
            num_envs = max(0, parseInt(p('num_simulations')));
            while (metas.length > num_envs) metas.pop();
            while (metas.length < num_envs) metas.push(new_meta());
            for (let i=0; i<metas.length; ++i) {
                const meta = metas[i];
                const action = policy(meta.env.make_observation(), p);
                meta.total_reward += meta.env.step(action);
                meta.ticks += 1;
                if (meta.ticks > max_steps) {
                    rewards.push(meta.total_reward);
                    metas[i] = new_meta();
                }
            }
        }


        //
        // UI stuff below
        //


        const block_container = this.block_container;

        const policy_block = block_container
            .append('block')
            .classed('policy', true)
            .style('grid-column-start', 1)
            .style('grid-column-end', 3)
        policy_block.append('h2').text('Policy')
        policy_block.append('pre').append('code')
            .classed('language-javascript', true)
            .text(''+policy)
            .style('overflow-x', 'auto')
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });

        const info_block = block_container
            .append('block')
            .classed('info', true)
        info_block.append('h2').text('Level 2')
        info_block.append('div').text()
        const navigation = info_block.append('div')
        navigation.append('a')
            .text('Back')
            .attr('href', '#')
            .on('click', () => this.level_done(-1))
        navigation.append('span').text(' ')
        navigation.append('a')
            .text('Finish')
            .attr('href', '#')
            .on('click', () => this.level_done(+1))

        // parameters
        const param_block = block_container.append('block').classed('params', true)
        param_block.append('h2').text('Parameters')
        const param_table = param_block.append('table')
        function on_parameter_change(event, parameter) {
            const el = event.srcElement;
            const val = parseFloat(el.value);
            if (!isFinite(val)) {
                el.classList.add('invalid');
                return;
            }
            el.classList.remove('invalid');
            if (val == parameter.val) return;
            parameter.val = val;
            render_params(params);
            metas = metas.map(() => new_meta());
            rewards = [];
        }
        function render_params(params) {
            function update_row(selection) {
                selection.select('input').attr('value', d => d.val)
            }
            param_table
                .selectAll('.param-row')
                .data(params)
                .join(
                    enter => {
                        const row = enter.append('tr').classed('param-row', true);
                        row.append('td').text(d => d.name + '').classed('label', true)
                        row.append('td').append('input')
                            .attr('type', 'number')
                            .on('change', on_parameter_change)
                            .on('keyup', on_parameter_change)
                        update_row(row)
                    }
                    ,
                    update_row
                )
        }
        render_params(params);

        let rewards_block = block_container.append('block').classed('rewards', true)
        const format_reward = x => x.toFixed(2)
        let average_reward_span = rewards_block
            .append('h2')
            .text(d => 'Average Reward: ')
            .append('span')
        function render_rewards(rewards) {
            average_reward_span.text((rewards.length == 0)? '' : format_reward(sum(rewards) / rewards.length));
        }
        render_rewards(rewards);

        function render_metas(metas) {
            const svg_r = 100;
            block_container
                .selectAll('block.env')
                .data(metas)
                .join(
                enter => {
                    const block = enter
                        .append('block')
                        .classed('env', true);

                    // block.append('div').classed('theta', true)
                    // block.append('div').classed('theta_dot', true)
                    const svg = block.append('svg')
                        .style('width', '100%')
                        .style('height', 200)
                        .attr('viewBox', `${-svg_r} ${-svg_r} ${2*svg_r} ${2*svg_r}`)
                        .attr('preserveAspectRatio', 'xMidYMid meet ')
                    const line = svg.append('line')
                        .classed('paddle', true)
                        .attr('x1', 0)
                        .attr('y1', 0)
                        .attr('stroke', '#d11')
                        .attr('stroke-width', 15)
                        .attr('stroke-linecap', 'round')
                    const circle = svg.append('circle')
                        .attr('r', 3)
                        .attr('fill', 'black')
                }
                ,
                update => {
                    // const block = update.select('block');
                    // update.select('.theta').text(d => d.env.make_observation().x);
                    // update.select('.theta_dot').text(d => d.env.theta_dot);
                    const paddle_r = 80;
                    update.select('.paddle')
                        .attr('x2', d => - paddle_r * sin(d.env.theta))
                        .attr('y2', d => - paddle_r * cos(d.env.theta))
                }
            );
        }

        let last_physics_time;
        let finished = false;
        function render(timestamp_ms) {
            if (finished) return;
            const timestamp = timestamp_ms / 1000.;
            if (last_physics_time === undefined) {
                physics_step();
                last_physics_time = timestamp;
            }
            let i;
            for (i=0; i<10 && last_physics_time + dt <= timestamp; ++i) {
                physics_step();
                last_physics_time += dt;
            }
            if (last_physics_time + dt <= timestamp) {
                last_physics_time = timestamp;
                console.log('oh no, your computer can not keep up. :(')
            }

            render_metas(metas);
            render_rewards(rewards);
            window.requestAnimationFrame(render);
        }
        window.requestAnimationFrame(render);


        // debugger
        return new Promise((level_done, reject) => {
            this.level_done = level_done;
            this.reject = reject;
        }).finally(() => {
            finished = true;
        });
    }
}
*/
