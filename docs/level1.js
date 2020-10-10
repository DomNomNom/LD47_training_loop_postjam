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


const num_ticks = 100;
export function average_total_reward(seeds, params) {
    const p = param_name => params[param_name];
    const rewards = seeds.map(seed => {
        const env = new PendulumEnv(seed);
        let total_reward = 0;
        for (let i=0; i<num_ticks; ++i) {
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
        const metas = [];  // { env, total_reward, seed }
        const params = []; // keys to params in insertion order.
        const param_name_to_index = {};
        const p = param_name => params[param_name_to_index[param_name]].val;
        function new_meta(seed=undefined) {
            seed = (seed===undefined)? rng.int32().toString(16).padStart(8, '0') : seed;
            const env = new PendulumEnv(seed);
            const observation = env.make_observation();
            return {
                seed,
                env,
                total_reward: 0,
                tick: 0,
                observation,
                action: policy(observation, p),
                // Things below here are not merged in merge_new_meta
                is_debug: false,
                is_paused: false,
                ticks_per_physics: 1,
                requested_ticks: 0,  // How often the user clicked 'step' since last physics
                randomize_seed: true,
            };
        }
        function merge_new_meta(meta) {
            const n = new_meta((meta.randomize_seed)? undefined : meta.seed);
            for (const key of ['seed', 'env', 'total_reward', 'tick', 'observation', 'action']) {
                meta[key] = n[key];
            }
        }

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
                const next_tick = meta.tick + meta.requested_ticks + ((meta.is_paused)? 0 : meta.ticks_per_physics);
                meta.requested_ticks = 0;
                let same_env = true;
                let t = floor(meta.tick);
                for (; t+1 <= next_tick && t < num_ticks; ++t) {
                    meta.total_reward += meta.env.step(meta.action);
                    meta.observation = meta.env.make_observation();
                    meta.action = policy(meta.observation, p);
                }
                if (t < num_ticks) {
                    meta.tick = next_tick;
                } else {
                    rewards.push(meta.total_reward);
                    merge_new_meta(meta);
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
        info_block.append('h2').text('Level 1')
        info_block.append('div').text(`
            This scenario rewards you for adjusting parameters to keep the paddle upright,
            using as little torque as necessary.
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
            metas.forEach(merge_new_meta);
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
                        .text('play/pause')
                        .on('click', (e, d) => { d.is_paused = !d.is_paused; })
                    time_controls.append('button')
                        .text('step')
                        .on('click', (e, d) => { d.is_paused = true; d.requested_ticks += 1; })
                    time_controls.append('button')
                        .text('faster')
                        .on('click', (e, d) => { d.is_paused = false; d.ticks_per_physics *= 2; })
                    const seed_controls = debug_contents.append('div').classed('seed-controls', true);
                    seed_controls.append('span').text('Seed: ')
                    const on_change_seed = (e, d) => {
                        d.seed = e.target.value;
                        d.randomize_seed = false;
                        merge_new_meta(d);
                    };
                    seed_controls.append('input')
                        .attr('type', 'text')
                        .classed('seed-input', true)
                        .on('input', on_change_seed)
                        // .on('keyup', on_change_seed)
                    const make_seed_randomize_id = (d, i) => `randomize-seed-${i}`;
                    seed_controls.append('input')
                        .classed('randomize-seed', true)
                        .attr('type', 'checkbox')
                        .attr('id', make_seed_randomize_id)
                        .on('change', (e,d) => { d.randomize_seed = e.target.checked; })
                    seed_controls.append('label').text('random').attr('for', make_seed_randomize_id)
                    debug_contents.append('pre').classed('debug_inout', true)

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
                        .attr('x2', d => - paddle_r * d.observation.x)
                        .attr('y2', d => - paddle_r * d.observation.y)

                    update.selectAll('.debug-contents')
                        .classed('hidden', d => !d.is_debug)
                    const format_obj = x => JSON.stringify(x, null, '  ')
                    update.selectAll('.debug_inout').text(
                        d => [
                            `tick: ${d.tick}`,
                            `observation: ${format_obj(d.observation)}`,
                            `action: ${format_obj(d.action)}`,
                        ].join('\n')
                    )
                    update.selectAll('.seed-input').each(function(d) {  if (this.value != d.seed) this.value = d.seed; })
                    update.selectAll('.randomize-seed').property('checked', d => d.randomize_seed)
                }
            );
        }

        let last_physics_time;
        let finished = false;
        let num_spiral_of_death_avoids = 0;
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
                num_spiral_of_death_avoids++;
                if (num_spiral_of_death_avoids > 100) {
                    console.log('oh no, your computer can not keep up. :(')
                }
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
