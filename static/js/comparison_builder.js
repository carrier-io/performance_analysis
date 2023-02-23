const chart_options = {
    type: 'line',
    options: {
        // animation: false,
        responsive: true,
        // hoverMode: 'index',
        // interaction: {
        //     mode: 'point'
        // },
        plugins: {
            legend: {
                display: true,
                onHover: (event, legendItem, legend) => {
                    // console.log(event, legendItem, legend)
                    legend.chart.data.datasets[legendItem.datasetIndex].radius = 12
                    // let tooltips = []
                    // for (let i = 0; i < legend.chart.data.datasets[legendItem.datasetIndex].data.length; i++) {
                    //     tooltips.push({
                    //         datasetIndex: legendItem.datasetIndex,
                    //         index: i
                    //     })
                    // }
                    // legend.chart.tooltip.setActiveElements(tooltips)
                    legend.chart.update()
                },
                onLeave: (event, legendItem, legend) => {
                    // console.log(event, legendItem, legend)
                    legend.chart.data.datasets[legendItem.datasetIndex].radius = 6
                    // legend.chart.tooltip.setActiveElements([])
                    legend.chart.update()
                },
                labels: {
                    usePointStyle: true
                },
            },
            title: {
                display: false
            },
            tooltip: {
                callbacks: {
                    title: tooltip_items => {
                        const date_array = Array.from(
                            new Set(tooltip_items.map(i => i.raw.tooltip.real_start_time))
                        ).map(i => new Date(i)).sort((a, b) => a - b)
                        if (date_array.length === 1) {
                            return date_array
                        } else {
                            return [date_array[0], 'to', date_array.at(-1)]
                        }
                    },
                    afterTitle: tooltip_items => {
                        const d = new Date(tooltip_items[0].parsed.x)
                        d.setHours(0)
                        return `+${d.toLocaleTimeString()} from test start`
                    },
                    beforeLabel: ({raw}) => {
                        let result = `test: ${raw.tooltip.test_name}; env: ${raw.tooltip.test_env}`
                        if (raw.tooltip.loop) {
                            result += `\nloop: ${raw.tooltip.loop}`
                        }
                        return result
                    },
                    label: ({raw, formattedValue}) => `${raw.tooltip.metric}: ${formattedValue}`,
                    afterLabel: ({raw}) => {
                        if (raw.tooltip.page) {
                            return `page: ${raw.tooltip.page}`
                        }
                        if (raw.tooltip.request) {
                            return `request: ${raw.tooltip.request}`
                        }
                    },
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    // unit: 'day',
                    displayFormats: {
                        // todo: write more formatters
                        // day: 'dd MM'
                        hour: "hh:mm:ss",
                        minute: "mm:ss",
                        second: "m:ss",
                    },
                    maxUnit: 'hour',
                    minUnit: 'second'
                },
                // grid: {
                //     display: false
                // },
                ticks: {
                    count: 10,
                    max: 10,
                    // source: 'data'
                },
                display: 'auto',
                // min: 0
                // display: false
            },
            y: {
                type: 'linear',
                position: 'left',
                // text: 'Y label here',
                // display: 'auto',
                // display: true,
                display: 'auto',
                grid: {
                    display: true,
                    borderDash: [2, 1],
                    color: "#D3D3D3"
                },
                // ticks: {
                //     count: 10
                // }
                min: 0
            },
            counts: {
                type: 'linear',
                position: 'right',
                // text: 'Counts',
                display: 'auto',
                // display: true,
                grid: {
                    drawOnChartArea: false, // only want the grid lines for one axis to show up
                //     display: true,
                //     borderDash: [2, 1],
                //     color: "#D3D3D3"
                },
                ticks: {
                    stepSize: 1
                },
                min: 0
            },
        }
    },
}

// constants and public functions
window.NAME_DELIMITER = ' | '

const get_random_color = () => {
    const rnd = () => Math.floor(Math.random() * 255)
    return `rgb(${rnd()}, ${rnd()}, ${rnd()})`
}
const builder_metrics = {
    [page_constants.ui_name]: {
        load_time: {name: 'Load Time', color: get_random_color()},
        dom: {name: 'DOM', color: get_random_color()},
        tti: {name: 'tti', color: get_random_color()},
        fcp: {name: 'fcp', color: get_random_color()},
        lcp: {name: 'lcp', color: get_random_color()},
        cls: {name: 'cls', color: get_random_color()},
        tbt: {name: 'tbt', color: get_random_color()},
        fvc: {name: 'fvc', color: get_random_color()},
        lvc: {name: 'lvc', color: get_random_color()},
    },
    [page_constants.backend_name]: {
        min: {name: 'min', color: get_random_color()},
        max: {name: 'max', color: get_random_color()},
        median: {name: 'median', color: get_random_color()},
        pct90: {name: 'pct90', color: get_random_color()},
        pct95: {name: 'pct95', color: get_random_color()},
        pct99: {name: 'pct99', color: get_random_color()},
        total: {name: 'total', color: get_random_color(), scale: 'counts'},
        failures: {name: 'failures', color: get_random_color(), scale: 'counts'},
        throughput: {name: 'throughput', color: get_random_color(), scale: 'counts'},
        onexx: {name: 'onexx', color: get_random_color(), scale: 'counts'},
        twoxx: {name: 'twoxx', color: get_random_color(), scale: 'counts'},
        threexx: {name: 'threexx', color: get_random_color(), scale: 'counts'},
        fourxx: {name: 'fourxx', color: get_random_color(), scale: 'counts'},
        fivexx: {name: 'fivexx', color: get_random_color(), scale: 'counts'},
        users: {name: 'users', color: get_random_color(), scale: 'counts'},
    }
}
const clear_block_filter = (block_id, update_chart = true) => {
    // clear from chart
    window.chart_builder.data.datasets = window.chart_builder.data.datasets.filter(ds =>
        ds.source_block_id !== block_id
    )
    update_chart && window.chart_builder.update()
}

const parse_action = action => {
    if (action.includes(NAME_DELIMITER)) {
        const [test_name, test_env, action_name] = action.split(NAME_DELIMITER)
        return [test_name, test_env, action_name]
    } else {
        return [null, null, action]
    }
}

const get_actions_to_display = (test, selected_actions) => selected_actions.reduce((accum, option) => {
    const [test_name, test_env, action_name] = parse_action(option)
    if (test_name !== null && test_env !== null) {
        if (test_name === test.name && test_env === test.test_env) {
            accum.push(action_name)
        }
    } else {
        accum.push(action_name)
    }
    return accum
}, [])

const clear_filter_blocks_from_table = block_ids => {
    V.registered_components.table_comparison.table_action('remove',
        {field: 'source_block_id', values: block_ids}
    )
}

var comparison_formatters = {
    source_block_id(value, row) {
        // ('#1671449291816')[0].scrollIntoView({behavior: "smooth", block: "start"})
        return `<a class="fa fa-file-arrow-up" href="#${value}"></a>`
    }
}

// components
const FilterBlock = {
    delimiters: ['[[', ']]'],
    props: [
        'idx', 'block_id', 'block_type', 'action_options',
        'metric_options', 'is_loading', 'initial_actions', 'initial_metrics',
        'saved', 'multi_env', 'sharing_mode', 'updated_at'
    ],
    emits: ['remove', 'apply', 'selection_change', 'save', 'delete'],
    data() {
        return {
            selected_actions: [],
            selected_metrics: [],
            initialization_flag: true,
        }
    },
    mounted() {
        if (this.pre_selected_actions_indexes.length > 0 || this.pre_selected_metrics_indexes > 0) {
            this.$nextTick(() => {
                this.handle_apply_click()
                this.$nextTick(() => this.initialization_flag = false)
            })
        } else {
            this.initialization_flag = false
        }
    },
    methods: {
        handle_apply_click() {
            this.$emit('apply', this.idx, this.selected_actions, this.selected_metrics)
        },
        handle_remove() {
            this.$emit('remove', this.idx)
            this.$emit('delete', this.idx)
        },
        handle_save_click() {
            this.$emit('save', this.idx)
        }
    },
    watch: {
        selected_actions() {
            this.$emit('selection_change', this.$data)
        },
        selected_metrics() {
            this.$emit('selection_change', this.$data)
        },
        pre_selected_actions_indexes(newValue, oldValue) {
            this.selected_actions = this.initial_actions
            this.$nextTick(() => {
                this.handle_apply_click()
            })
        },
        pre_selected_metrics_indexes(newValue, oldValue) {
            this.selected_metrics = this.initial_metrics
            this.$nextTick(() => {
                this.handle_apply_click()
            })
        }
    },
    computed: {
        pre_selected_actions_indexes() {
            if (this.initial_actions === undefined) {
                return []
            }
            return this.action_options.reduce((accum, i, index) => {
                if (this.initial_actions.indexOf(i) > -1) {
                    accum.push(index)
                }
                return accum
            }, [])
        },
        pre_selected_metrics_indexes() {
            if (this.initial_metrics === undefined) {
                return []
            }
            return Object.keys(this.metric_options).reduce((accum, i, index) => {
                if (this.initial_metrics.indexOf(i) > -1) {
                    accum.push(index)
                }
                return accum
            }, [])
        },
        colored_metric_options() {
            return Object.entries(this.metric_options).map(([k, {name, color}]) => {
                console.log(k, name, color)

                return {
                    name,
                    data_key: k,
                    // html: `<span style="color: ${color || '#000'}" class="w-100 d-inline-block ml-3">${name}</span>`,
                    html: `<span class="w-100 d-inline-block ml-3">${name}<span class="ml-1 circle" style="border-color: ${color}" ></span></span>`,
                }
            })
        },
        multiselect_title() {
            return this.block_type === page_constants.backend_name ? 'Transactions/Requests' : 'Pages/Actions'
        },
        formatted_actions() {
            return this.action_options.map(i => ({name: this.multi_env ? i : parse_action(i)[2], value: i}))
        }
    },
    template: `
    <div class="d-flex flex-grow-1 p-3 align-items-center" :id="block_id">
        <div class="d-flex flex-column flex-grow-1">
            <p class="font-h5 font-bold mb-1 text-gray-800">
                [[ multiselect_title ]]
            </p>
            <MultiselectDropdown
                :list_items="formatted_actions"
                v-model="selected_actions"
                placeholder="Select items"
                :pre_selected_indexes="pre_selected_actions_indexes"
                return_key="value"
                :key="sharing_mode ? updated_at : block_id"
            ></MultiselectDropdown>
            <p class="font-h5 font-bold my-1 text-gray-800">Metrics</p>
            <MultiselectDropdown
                :list_items="colored_metric_options"
                v-model="selected_metrics"
                placeholder="Select metrics"
                return_key="data_key"
                :pre_selected_indexes="pre_selected_metrics_indexes"
                :key="sharing_mode ? updated_at : block_id"
            ></MultiselectDropdown>
            <div class="pt-3">
                <button class="btn btn-secondary mr-2"
                    :disabled="is_loading || (selected_actions.length === 0 || selected_metrics.length === 0)"
                    @click="handle_apply_click"
                >
                    Apply
<!--                    <i class="spinner-loader" style="position: absolute; top: 8px; right: 5px"-->
<!--                        v-if="is_loading"-->
<!--                    ></i>-->
                </button>
                <button class="btn btn-secondary btn-32"
                    :disabled="is_loading || (selected_actions.length === 0 || selected_metrics.length === 0)"
                    @click="handle_save_click"
                    v-if="sharing_mode"
                >
                    <i class="spinner-loader"
                        v-if="is_loading"
                    ></i>
                    <i class="fa fa-share"
                        v-else
                    ></i>
                </button>
                <button class="btn btn-secondary btn-32"
                    :disabled="saved || is_loading || (selected_actions.length === 0 || selected_metrics.length === 0)"
                    @click="handle_save_click"
                    v-else
                >
                    <i class="spinner-loader"
                        v-if="is_loading"
                    ></i>
                    <i class="fa fa-save"
                        v-else
                    ></i>
                </button>
            </div>
            
        </div>
        <i class="icon__16x16 icon-minus__16 ml-4 mb-3" 
            @click="handle_remove"
        ></i>
    </div>
    `
}

const BuilderFilter = {
    delimiters: ['[[', ']]'],
    components: {
        'FilterBlock': FilterBlock,
    },
    props: ['unique_groups', 'ui_performance_builder_data', 'backend_performance_builder_data',
        'tests', 'backend_time_aggregation', 'user_filters', 'shared_filters'],
    data() {
        return {
            blocks: [],
            backend_options: [],
            ui_options: [],
            is_loading: false,
            all_tests_backend_requests: [],
            all_tests_ui_pages: [],
            earliest_date: new Date(),
            filter_selections: {},
            comparison_hash: new URLSearchParams(location.search).get('source'),
            multi_env: {
                [page_constants.backend_name]: false,
                [page_constants.ui_name]: false
            },
            share_uid: new URLSearchParams(location.search).get('share'),
        }
    },
    async mounted() {
        // setting options
        const {page_names, earliest_date: ui_earliest_date} = this.ui_performance_builder_data
        this.all_tests_ui_pages = page_names
        const {all_requests, earliest_date: backend_earliest_date} = this.backend_performance_builder_data
        this.all_tests_backend_requests = all_requests
        this.set_options()

        // setting earliest date for charts
        if (ui_earliest_date === undefined && backend_earliest_date === undefined) {
            console.error('Earliest date cannot be set')
        } else if (ui_earliest_date === undefined) {
            this.earliest_date = new Date(backend_earliest_date)
        } else if (backend_earliest_date === undefined) {
            this.earliest_date = new Date(ui_earliest_date)
        } else {
            this.earliest_date = new Date(ui_earliest_date) < new Date(backend_earliest_date) ?
                new Date(ui_earliest_date) : new Date(backend_earliest_date)
        }

        window.chart_builder = new Chart('builder_chart', chart_options)
        $('html').css({'scroll-behavior': 'smooth'}) // todo: maybe we don't need that


        // setting session storage items
        const stored_filters = JSON.parse(sessionStorage.getItem(this.comparison_hash))
        if (stored_filters !== null) {
            const user_filters_ids = this.user_filters.map(f => f.id)
            this.blocks = stored_filters.filter(f =>
                !user_filters_ids.includes(f.id)
            ).map(f => {
                f.is_loading = false
                f.saved = false
                return f
            })
            sessionStorage.removeItem(this.comparison_hash)
        }

        // setting root function for getting state
        this.$root.custom_data.get_filter_blocks_state = () => this.blocks.map(({id, type}) => {
            const {
                selected_actions: initial_actions,
                selected_metrics: initial_metrics
            } = this.filter_selections[id]
            return {id, type, initial_actions, initial_metrics}
        })

        // function for setting filters
        const set_filters = filters => {
            this.blocks = [...this.blocks, ...filters.map(f => {
                f.is_loading = false
                f.saved = true
                return f
            })]
        }

        if (this.sharing_mode) {
            // set initial state of shared filters
            set_filters(this.shared_filters)
            // connect to websocket if in sharing mode
            this.setup_websocket()
        } else {
            // alert of user persistent filters
            if (this.user_filters?.length > 0) {
                this.$root.custom_data.set_user_persistent_filters = set_filters.bind(this, this.user_filters)
                alertMain.add(
                    `
                        You have saved filters for this comparison. 
                        <button class="btn btn-basic btn-sm d-inline mx-1" data-dismiss="alert" 
                            onclick="V.custom_data.set_user_persistent_filters()">
                            Load
                        </button>
                    `,
                    'info-overlay',
                    true
                )
            }
        }


    },
    methods: {
        setup_websocket() {
            window.socket.on(
                `performance_analysis_${this.comparison_hash}_${this.share_uid}`,
                async payload => {
                    console.debug('websocket payload', payload)
                    if (this.$root.user.id !== payload.user.id) {
                        showNotify('INFO', `${payload.user.name} changed filters`)
                        this.blocks = payload.data
                        // this.blocks = this.blocks.filter(i => payload.new_item.id !== i.id).push(payload.new_item)
                    }
                }
            )
        },
        handle_remove(idx) {
            const {id: block_id} = this.blocks.splice(idx, 1)[0]
            clear_block_filter(block_id)
            clear_filter_blocks_from_table([block_id])
        },
        make_id() {
            return new Date().valueOf()
        },
        handle_clear_all() {
            window.chart_builder.data.datasets = []
            window.chart_builder.update()
            this.$root.registered_components.table_comparison.table_action('removeAll')
            this.blocks = []
        },
        set_options() {
            Object.entries(this.unique_groups).forEach(([group, i]) => {
                switch (group) {
                    case 'backend_performance':
                        this.backend_options = this.all_tests_backend_requests.reduce((accum, o) => {
                            return [...accum, ...i.map(combo => [...combo, o].join(NAME_DELIMITER))]
                        }, [])
                        this.multi_env[page_constants.backend_name] = i.length > 1
                        break
                    case 'ui_performance':
                        this.ui_options = this.all_tests_ui_pages.reduce((accum, o) => {
                            return [...accum, ...i.map(combo => [...combo, o].join(NAME_DELIMITER))]
                        }, [])
                        this.multi_env[page_constants.ui_name] = i.length > 1
                        break
                    default:
                        console.warn('Unknown test group: ', group)
                }
            })
        },
        make_backend_data(test, block_data, selected_actions, selected_metrics) {
            let datasets = []
            let table_data = []
            if (test.datasets[this.backend_time_aggregation] === undefined) {
                return [datasets, table_data]
            }
            const requests = get_actions_to_display(test, selected_actions)
            requests.forEach(request => {
                if (test.datasets[this.backend_time_aggregation][request] !== undefined) {
                    const request_earliest_date_value = Math.min(
                        ...test.datasets[this.backend_time_aggregation][request].map(
                            scoped_dataset => new Date(scoped_dataset.time)
                        )
                    )
                    selected_metrics.forEach(metric => {
                        const {name, color} = builder_metrics[block_data.type][metric]
                        const dataset_data = test.datasets[this.backend_time_aggregation][request].map(scoped_dataset => {
                            const time_delta = new Date(scoped_dataset.time) - request_earliest_date_value
                            // const time_delta = new Date(test.start_time) - new Date(scoped_dataset.time)
                            return {
                                // x: new Date(this.earliest_date.valueOf() + time_delta),
                                x: new Date(time_delta),
                                y: scoped_dataset[metric],
                                tooltip: {
                                    test_name: test.name,
                                    test_env: test.test_env,
                                    test_id: test.id,
                                    metric: name,
                                    request: request,
                                    real_start_time: scoped_dataset.time
                                },
                                border_color: color
                            }
                        }).sort((a, b) => {
                            return a.x - b.x
                        })
                        const scale = builder_metrics[block_data.type][metric].scale || 'y' // could be 'counts'
                        const dataset = {
                            label: `${test.name}(${test.id}) ${request}: ${metric}`,
                            data: dataset_data,
                            // fill: true,
                            borderColor: dataset_data.map(i => i.border_color || '#ffffff'),
                            borderWidth: 2,
                            backgroundColor: get_random_color(),
                            tension: scale === 'y' ? 0.4 : 0,
                            type: 'line',
                            showLine: true,
                            radius: 4,
                            // hidden: true,
                            source_block_id: block_data.id,
                            yAxisID: scale
                        }
                        datasets.push(dataset)
                        const table_data_metrics = test.aggregated_requests_data[request]
                        table_data.push({
                            test_id: test.id,
                            name: test.name,
                            start_time: new Date(table_data_metrics.time),
                            page: request,
                            metric: metric,
                            source_block_id: block_data.id,
                            value: table_data_metrics[metric]
                        })
                    })
                }
            })

            return [datasets, table_data]
        },
        make_ui_data(test, block_data, selected_actions, selected_metrics) {
            let datasets = []
            let table_data = []
            const pages = get_actions_to_display(test, selected_actions)
            selected_metrics.forEach(metric_data_key => {
                const page_data = pages.reduce((accum, page) => {
                    Object.entries(test.datasets[page]).forEach(([loop_id, ds]) => {
                        const time_delta = new Date(ds.timestamp) - new Date(test.loop_earliest_dates['1'])
                        // const time_delta = new Date(ds.timestamp) - new Date(test.start_time)
                        const {name, color} = builder_metrics[block_data.type][metric_data_key]
                        if (accum[loop_id] === undefined) {
                            accum[loop_id] = []
                        }
                        accum[loop_id].push({
                            // x: new Date(this.earliest_date.valueOf() + time_delta),
                            x: new Date(time_delta),
                            y: ds[metric_data_key],
                            tooltip: {
                                test_name: test.name,
                                test_env: test.test_env,
                                test_id: test.id,
                                loop: loop_id,
                                metric: name,
                                page: page,
                                real_start_time: ds.timestamp,
                            },
                            border_color: color
                        })
                    })
                    return accum

                }, {})
                Object.entries(page_data).forEach(([loop_id, loop_pages_data]) => {
                    loop_pages_data = loop_pages_data.sort((a, b) => a.x - b.x)
                    const dataset = {
                        label: `${test.name}(id: ${test.id}) - loop: ${loop_id} - ${metric_data_key}`,
                        data: loop_pages_data,
                        fill: false,
                        borderColor: loop_pages_data.map(i => i.border_color || '#ffffff'),
                        borderWidth: 1,
                        backgroundColor: get_random_color(),
                        tension: 0.5,
                        // type: 'scatter',
                        type: 'line',
                        borderDash: [7, 7],
                        radius: 6,
                        // hidden: true,
                        source_block_id: block_data.id,
                        showLine: true
                    }
                    // console.log('dataset', dataset)
                    datasets.push(dataset)
                    table_data = [...table_data, ...dataset.data.map(dsi => ({
                        test_id: test.id,
                        name: test.name,
                        start_time: dsi.tooltip.real_start_time,
                        page: dsi.tooltip.page,
                        metric: dsi.tooltip.metric,
                        source_block_id: block_data.id,
                        value: dsi.y
                    }))]
                })


            })
            return [datasets, table_data]
        },
        handle_apply(block_index, selected_actions, selected_metrics) {
            const block_data = this.blocks[block_index]
            let all_datasets = []
            let all_table_data = []

            switch (block_data.type) {
                case page_constants.backend_name:
                    this.tests.filter(({group}) => group === block_data.type).forEach(test => {
                        const [datasets, table_data] = this.make_backend_data(
                            test, block_data, selected_actions, selected_metrics
                        )
                        all_datasets = [...all_datasets, ...datasets]
                        all_table_data = [...all_table_data, ...table_data]
                    })
                    break
                case page_constants.ui_name:
                    this.tests.filter(({group}) => group === block_data.type).forEach(test => {
                        const [datasets, table_data] = this.make_ui_data(
                            test, block_data, selected_actions, selected_metrics
                        )
                        all_datasets = [...all_datasets, ...datasets]
                        all_table_data = [...all_table_data, ...table_data]
                    })
                    break
                default:
                    throw 'UNKNOWN DATA TYPE'
            }

            clear_block_filter(block_data.id, false)
            window.chart_builder.data.datasets = [...window.chart_builder.data.datasets, ...all_datasets]
            window.chart_builder.update()

            this.$root.registered_components.table_comparison.el.ready(() => {
                clear_filter_blocks_from_table([block_data.id])
                this.$root.registered_components.table_comparison.table_action('append', all_table_data)
            })
        },
        handle_add_filter_block(block_type = undefined) {
            if (block_type === undefined) {
                block_type = this.backend_options.length === 0 ? page_constants.ui_name : page_constants.backend_name
            }
            this.blocks.push({
                id: this.make_id(),
                type: block_type,
                is_loading: false,
                saved: false,
            })
        },
        get_action_options(type) {
            return type === page_constants.backend_name ? this.backend_options : this.ui_options
            // return builder_metrics[type] || {}
        },
        get_metric_options(type) {
            return builder_metrics[type] || {}
        },
        async handle_save_user_filter(block_index) {
            const block_data = this.blocks[block_index]
            block_data.is_loading = true
            block_data.updated_at = new Date().valueOf()
            const {id, type, updated_at} = block_data
            const {
                selected_actions: initial_actions,
                selected_metrics: initial_metrics
            } = this.filter_selections[block_data.id]
            const response = await fetch(
                `${api_base}/performance_analysis/user_filters/${getSelectedProjectId()}/${this.comparison_hash}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({id, type, initial_actions, initial_metrics, updated_at}),
                    headers: {'Content-Type': 'application/json'},
                }
            )
            if (response.ok) {
                block_data.saved = true
                showNotify('SUCCESS', 'Filter saved')
            } else {
                showNotify('ERROR', 'Couldn\'t save filter')
            }
            block_data.is_loading = false
        },
        async handle_save_shared_filter(block_index) {
            const block_data = this.blocks[block_index]
            block_data.is_loading = true
            block_data.updated_at = new Date().valueOf()
            const {id, type, updated_at} = block_data
            const {selected_actions: initial_actions, selected_metrics: initial_metrics} = this.filter_selections[id]
            block_data.initial_actions = initial_actions
            block_data.initial_metrics = initial_metrics
            const response = await fetch(
                `${api_base}/performance_analysis/shared_filters/${getSelectedProjectId()}/${this.comparison_hash}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        uid: this.share_uid,
                        filter_data: {
                            id, type, updated_at,
                            initial_actions, initial_metrics,
                        }
                    }),
                    headers: {'Content-Type': 'application/json'},
                }
            )
            if (response.ok) {
                showNotify('SUCCESS', 'Filter applied to share')
            } else {
                showNotify('ERROR', 'Couldn\'t share filter')
            }
            block_data.is_loading = false
        },
        async handle_save(block_index) {
            return this.sharing_mode ?
                this.handle_save_shared_filter(block_index) :
                this.handle_save_user_filter(block_index)
        },
        handle_selection_change(id, index, data) {
            if (!data.initialization_flag) {
                this.blocks[index].saved = false
            }
            this.filter_selections[id] = data
        }
    },
    computed: {
        sharing_mode() {
            return this.share_uid !== null
        }
    },
    template: `
        <div class="builder_filter_container card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <p class="font-h5 font-bold py-3 px-4 text-gray-800">DATA FILTER</p>
                <p class="font-h5 font-bold py-3 px-4 text-gray-800" v-if="is_loading">LOADING</p>
                <p class="text-purple font-semibold font-h5 cursor-pointer d-flex align-items-center">
                    <span @click="handle_clear_all">Clear all</span>
                    <button class="btn"
                        v-if="backend_options.length === 0 || ui_options.length === 0"
                        @click="handle_add_filter_block()"
                    >
                        <i class="fa fa-plus text-purple"></i>
                    </button>
                    <div class="dropdown dropleft dropdown_action mr-2"
                        v-else
                    >
                        <button class="btn dropdown-toggle"
                                role="button"
                                data-toggle="dropdown"
                                aria-expanded="false">
                            <i class="fa fa-plus text-purple"></i>
                        </button>

                        <ul class="dropdown-menu">
                            <li class="px-3 py-1 font-weight-500">Add Filter</li>
                            <li class="dropdown-item" @click="handle_add_filter_block('${page_constants.backend_name}')">
                                <span class="pl-2">Backend</span>
                            </li>
                            <li class="dropdown-item" @click="handle_add_filter_block('${page_constants.ui_name}')">
                                <span class="pl-2">UI</span>
                            </li>
                        </ul>
                    </div>
                </p>
            </div>
            <hr class="my-0">
            <div class="builder_filter_blocks">
                <div v-for="({id, type, is_loading, initial_actions, initial_metrics, saved, updated_at}, index) in blocks" :key="id">
                    <hr class="my-0" v-if="index > 0">
                    <FilterBlock
                       :idx="index"
                       :block_id="id"
                       :block_type="type"
                       :is_loading="is_loading"
                       :action_options="get_action_options(type)"
                       :metric_options="get_metric_options(type)"
                       :initial_actions="initial_actions"
                       :initial_metrics="initial_metrics"
                       :saved="saved"
                       :multi_env="multi_env[type]"
                       :sharing_mode="sharing_mode"
                       :updated_at="updated_at"
                       @selection_change="data => handle_selection_change(id, index, data)"
                       @remove="handle_remove"
                       @apply="handle_apply"
                       @save="handle_save"
                    >
                    </FilterBlock>
                </div> 
            </div>
        </div>
    `
}
register_component('BuilderFilter', BuilderFilter)

$(document).on('vue_init', () => V.custom_data.time_aggregation = '1s')