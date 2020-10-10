import Random from "./random.js"
import {range, clip, sum} from "./utils.js"

import {PendulumEnv} from "./environments.js"

const {sin, cos, PI, min, max, floor} = Math;
const TAU = 2 * Math.PI;


const dt = 1/120.;  // Physics timestep


function policy({theta, theta_dot}, p) {
    let torque = (
        p('theta_weight') * theta +
        p('theta_dot_weight') * theta_dot
    );

    return clip(torque, -2, 2);
}


const max_steps = 100;
export function average_total_reward(seeds, params) {
    const p = param_name => params[param_name];
    const rewards = seeds.map(seed => {
        const env = new PendulumEnv(seed);
        let total_reward = 0;
        for (let i=0; i<max_steps; ++i) {
            const action = policy(env.make_observation(), p);
            total_reward += env.step(action);
        }
        return total_reward;
    });
    return sum(rewards) / rewards.length;
}

export default class Level1 {
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
                env: new PendulumEnv(seed),
                total_reward: 0,
                ticks: 0,

                is_debug: false,
                is_paused: false,
                ticks_per_physics: 1,
                requested_ticks: 0,  // How often the user clicked 'step' since last physics
            };
        }

        const params = []; // keys to params in insertion order.
        const param_name_to_index = {};
        const p = param_name => params[param_name_to_index[param_name]].val;
        {   // Initialize params via a single trace call.
            const trace_env = new PendulumEnv("YAAA");
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
                const next_ticks = meta.ticks + meta.requested_ticks + ((meta.is_paused)? 0 : meta.ticks_per_physics);
                meta.requested_ticks = 0;
                let same_env = true;
                for (let t=meta.ticks; t<floor(next_ticks) && same_env; ++t) {
                    meta.total_reward += meta.env.step(action);
                    if (meta.ticks > max_steps) {
                        rewards.push(meta.total_reward);
                        const n = new_meta();
                        for (const key of ['seed', 'env', 'total_reward', 'ticks']) {
                            meta[key] = n[key];
                        }
                        same_env = false;
                    }
                }
                if (same_env) meta.ticks = next_ticks;
                if (i==0) console.log(meta.is_debug, meta.is_paused, meta.ticks, next_ticks);
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
        info_block.append('h2').text('Level 1')
        info_block.append('div').text(`
            This scenario rewards you for adjusting parameters to keep the paddle upright
            , using as little torque as necessary.
            There is no strict win condition, (~-520 is good) try to find some interesting states.
        `)
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

                    const debug_check_div = block.append('div')
                    const debug_check = debug_check_div.append('input')
                        .attr('type', 'checkbox')
                        .attr('id', (d, i) => `is-debug-${i}`)
                        .on('change', (e, d) => { d.is_debug = e.target.checked; })
                    const debug_label = debug_check_div.append('label').text('Inspect').attr('for', (d, i) => `is-debug-${i}`)

                    const debug_contents = block.append('div').classed('debug-contents hidden', true)
                    const time_controls = debug_contents.append('div')
                    time_controls.append('button')
                        .text('slower')
                        .on('click', (e, d) => { d.is_paused = false; d.ticks_per_physics /= 2; })
                    time_controls.append('button')
                        .text('step')
                        .on('click', (e, d) => { d.is_paused = true; d.requested_ticks += 1; })
                    time_controls.append('button')
                        .text('play/pause')
                        .on('click', (e, d) => { d.is_paused = !d.is_paused; })
                    time_controls.append('button')
                        .text('faster')
                        .on('click', (e, d) => { d.is_paused = false; d.ticks_per_physics *= 2; })

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
                    const paddle_r = 80;
                    update.select('.paddle')
                        .attr('x2', d => - paddle_r * sin(d.env.theta))
                        .attr('y2', d => - paddle_r * cos(d.env.theta))

                    update.selectAll('.debug-contents')
                        .classed('hidden', d => !d.is_debug)
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
