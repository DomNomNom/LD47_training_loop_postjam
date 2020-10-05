import Random from "./random.js"
import {range} from "./utils.js"

const {sin, cos, PI, min, max} = Math;
const TAU = 2 * Math.PI;


const dt = 1/120.;  // Physics timestep

// debugger
class Environment {
    constructor(seed) {
        const rng = new Random(seed);
        this.theta = TAU * rng.uniform01();
        this.theta_dot = rng.uniform01();
    }

    step(action) {
        this.theta_dot += action * dt;
        this.theta += this.theta_dot * dt;
        this.theta = this.theta % TAU;
        if (this.theta < 0) {
            this.theta += TAU;
        }
        this.theta = (this.theta <= PI)? this.theta : this.theta - TAU
        return 1;
    }

    make_observation() {
        return {
            theta: this.theta,
            theta_dot: this.theta_dot,
        };
    }
}


function policy({theta, theta_dot}, p) {
    let torque = (
        p('theta') * theta +
        p('theta_dot') * theta_dot
    );

    const max_torque = 20;
    torque = min( max_torque, torque);
    torque = max(-max_torque, torque);
    return torque;
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
    return rewards.reduce((a,b) => a+b, 0) / rewards.length;
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
        let num_envs = 3;
        let results = [];
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
            policy(trace_env.make_observation(), trace_p);
        }

        // updates the metasmodel one step (all envs)
        function physics_step() {
            while (metas.length > num_envs) metas.pop();
            while (metas.length < num_envs) metas.push(new_meta());
            for (let i=0; i<metas.length; ++i) {
                const meta = metas[i];
                const action = policy(meta.env.make_observation(), p);
                meta.total_reward += meta.env.step(action);
                meta.ticks += 1;
                if (meta.ticks > 1000) {
                    results.push({i, total_reward: meta.total_reward});
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
        policy_block.append('pre').text(''+policy).style('overflow-x', 'auto')

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

                    block.append('div').classed('theta', true)
                    block.append('div').classed('theta_dot', true)
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
                    update.select('.theta').text(d => d.env.theta);
                    // update.select('.theta_dot').text(d => d.env.theta_dot);
                    const paddle_r = 80;
                    update.select('.paddle')
                        .attr('x2', d => - paddle_r * sin(d.env.theta))
                        .attr('y2', d => - paddle_r * cos(d.env.theta))
                }
            );
        }

        let last_physics_time;
        function render(timestamp_ms) {
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
            window.requestAnimationFrame(render);
        }
        window.requestAnimationFrame(render);


        // debugger
        return new Promise((level_done, reject) => {
            this.level_done = level_done;
            this.reject = reject;
        })
    }
}
