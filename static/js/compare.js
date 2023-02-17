var summary_formatters = {
    total(value, row, index) {
        if (row.group === 'backend_performance') {
            return value
        }
    },
}
var baseline_formatters = {
    set_row_baseline: row => {
        try {
            if (row.baseline === undefined) {
                row.baseline = V.custom_data.baselines[row.group][row.name][row.test_env]
                console.debug('Baseline set for', row.id, row.name, row.baseline)
            } else {
                console.debug('Baseline already exists', row.name)
            }
        } catch {
            console.debug('No Baseline found', row.name)
        }
    },
    cell_value: value => {
        if (value > 0) {
            return `<span style="color: green">+${value.toFixed(1)}</span>`
        } else if (value < 0) {
            return `<span style="color: red">${value.toFixed(1)}</span>`
        }
        return 0
    },
    _row_formatter: (value, row, index, field) => {
        if (value === undefined) {
            return
        }
        baseline_formatters.set_row_baseline(row)
        if (row.baseline === undefined) {
            return
        }
        try {
            const bsl_value = field.split('.').reduce((acc, key) => acc[key], row.baseline)
            console.log('V', value, 'BSL', bsl_value)
            return baseline_formatters.cell_value(value - bsl_value)
        } catch {
            return
        }
        // switch (row.group) {
        //     case 'backend_performance':
        //         try {
        //             const bsl_value = field.split('.').reduce((acc, key) => acc[key], row.baseline)
        //             console.log('V', value, 'BSL', bsl_value)
        //             return baseline_formatters.cell_value(value - bsl_value)
        //         } catch {
        //             return
        //         }
        //         break
        //     case 'ui_performance':
        //         // console.log('UI', row, field, value)
        //         try {
        //             const bsl_value = field.split('.').reduce((acc, key) => acc[key], row.baseline)
        //             console.log('V', value, 'BSL', bsl_value)
        //             return baseline_formatters.cell_value(value - bsl_value)
        //         } catch {
        //             return
        //         }
        //         break
        //     default:
        //         return
        // }

    },
    total(value, row, index, field) {
        return baseline_formatters._row_formatter(value, row, index, field)
    },
    throughput(value, row, index, field) {
        return baseline_formatters._row_formatter(value, row, index, field)
    },
    failures(value, row, index, field) {
        return baseline_formatters._row_formatter(value, row, index, field)
    },
    aggregations(value, row, index, field) {
        return baseline_formatters._row_formatter(value, row, index, field)
    },
    page_speed(value, row, index, field) {
        return baseline_formatters._row_formatter(value, row, index, field)
    },
}

$(document).on('vue_init', () => {
    V.custom_data.baselines = JSON.parse(V.registered_components.table_summary.table_attributes.baselines)
    V.custom_data.handle_add_tests = async selected_tests => {
        // V.custom_data.handle_add_tests = async (selected_tests, page_choices) => {
        if (selected_tests.length === 0) {
            showNotify('INFO', 'Select at least one test')
            return
        }
        // const existing_tests = V.registered_components.table_summary.table_action('getData')
        // const [selected_aggregation_backend, selected_aggregation_ui, selected_metric_ui] = page_choices
        const existing_filters = V.custom_data.get_filter_blocks_state()
        const resp = await window.handle_post_compare(
            selected_tests,
            // selected_aggregation_backend, selected_aggregation_ui, selected_metric_ui,
            {
                return_response: existing_filters.length > 0,
                merge_with_source: new URLSearchParams(location.search).get('source')
            }
        )
        if (resp.redirected) {
            const target_hash = new URL(resp.url).searchParams.get('source')
            sessionStorage.setItem(target_hash, JSON.stringify(existing_filters))
            window.location.href = resp.url
        } else {
            console.error('Not receiving redirect somehow. Check the api')
        }
    }
})

const handle_share_create = async () => {
    const comparison_hash = new URLSearchParams(location.search).get('source')
    const filter_data = V.custom_data.get_filter_blocks_state()
    const response = await fetch(
        `${api_base}/performance_analysis/shared_filters/${getSelectedProjectId()}/${comparison_hash}`,
        {
            method: 'POST',
            body: JSON.stringify(filter_data),
            headers: {'Content-Type': 'application/json'},
        })

    !response.ok && showNotify('ERROR', 'Sharing error')
    if (response.redirected) {
        window.location.href = response.url
    }
}