<script setup>
import { ref, onMounted, watch } from "vue";
import * as echarts from "echarts";
import WelcomeItem from "./WelcomeItem.vue";
import { useTransition } from "@vueuse/core";

const props = defineProps({
  receivedMessage: Object,
});
const selectedResponseTimes = ref([
  "Median Response Time",
  "95th Percentile Response Time",
]);
const selectedRPS = ref(["RPS"]);
const selectConcurrent_number = ref(["total_concurrent_number"]);
const unSetConcurrent_numberSelect = ref([]);
const unSetSelect = ref([]);
const unSetRPSSelect = ref([]);
const error_rate = ref(0);
const outputErrorRate = useTransition(error_rate, { duration: 1000 });
const rps = ref(0);
const outputRPS = useTransition(rps, { duration: 1000 });
const total_requests = ref(0);
const outputTotalRequests = useTransition(total_requests, { duration: 1000 });
const total_concurrent_number = ref(0);
const outputTotalConcurrentNumber = useTransition(total_concurrent_number, {
  duration: 1000,
});

const chartRPS = ref(null);
const chartResponseTime = ref(null);
const Concurrent_number = ref(null);
const rpsData = ref([]);
const Concurrent_numberData = ref([]);
const medianData = ref([]);
const ninetyFifthData = ref([]);
const allMessages = ref([]);

const legendSelectedRPS = {
  rps: true,
};

let rpsChart;
let responseTimeChart;
let Concurrent_numberChart;
const updateRPSChart = () => {
  if (rpsChart) {
    // 基础RPS系列
    let baseSeriesData = allMessages.value.map((message) => [
      message.timestamp,
      message.rps,
    ]);

    const series = [
      {
        name: "RPS",
        type: "line",
        data: baseSeriesData,
        showInLegend: true,
        itemStyle: {
          normal: {
            opacity: selectedRPS.value.includes("RPS") ? 1 : 0,
          },
        },
        lineStyle: {
          opacity: selectedRPS.value.includes("RPS") ? 1 : 0,
        },
      },
    ];

    // 为allMessages中的每个api_results的RPS添加系列
    if (allMessages.value.length > 0 && allMessages.value[0].api_results) {
      allMessages.value[0].api_results.forEach((apiResult) => {
        let apiSeriesData = allMessages.value.map((message) => {
          const result = message.api_results.find(
            (result) => result.name === apiResult.name
          );
          return result
            ? [message.timestamp, result.rps]
            : [message.timestamp, 0];
        });

        series.push({
          name: `${apiResult.name} RPS`,
          type: "line",
          data: apiSeriesData,
          showInLegend: true,
          itemStyle: {
            normal: {
              opacity: selectedRPS.value.includes(`${apiResult.name} RPS`)
                ? 1
                : 0,
            },
          },
          lineStyle: {
            opacity: selectedRPS.value.includes(`${apiResult.name} RPS`)
              ? 1
              : 0,
          },
        });
      });
    }
    console.log("rpsseries", series);

    // 更新图表
    rpsChart.setOption({
      xAxis: {
        type: "time",
        data: allMessages.value.map((message) => new Date(message.timestamp)),
      },
      series: series,
    });
  }
};

const updateConcurrent_numberChart = () => {
  if (Concurrent_numberChart) {
    let baseSeriesData = allMessages.value.map((message) => [
      message.timestamp,
      message.total_concurrent_number,
    ]);

    const series = [
      {
        name: "total_concurrent_number",
        type: "line",
        data: baseSeriesData,
        showInLegend: true,
        itemStyle: {
          normal: {
            opacity: selectConcurrent_number.value.includes(
              "total_concurrent_number"
            )
              ? 1
              : 0,
          },
        },
        lineStyle: {
          opacity: selectConcurrent_number.value.includes(
            "total_concurrent_number"
          )
            ? 1
            : 0,
        },
      },
    ];

    // 为allMessages中的每个api_results的RPS添加系列
    if (allMessages.value.length > 0 && allMessages.value[0].api_results) {
      allMessages.value[0].api_results.forEach((apiResult) => {
        let apiSeriesData = allMessages.value.map((message) => {
          const result = message.api_results.find(
            (result) => result.name === apiResult.name
          );
          return result
            ? [message.timestamp, result.concurrent_number]
            : [message.timestamp, 0];
        });

        series.push({
          name: `${apiResult.name} concurrent_number`,
          type: "line",
          data: apiSeriesData,
          showInLegend: true,
          itemStyle: {
            normal: {
              opacity: selectConcurrent_number.value.includes(
                `${apiResult.name} concurrent_number`
              )
                ? 1
                : 0,
            },
          },
          lineStyle: {
            opacity: selectConcurrent_number.value.includes(
              `${apiResult.name} concurrent_number`
            )
              ? 1
              : 0,
          },
        });
      });
    }
    console.log("series", series);
    // 更新图表
    Concurrent_numberChart.setOption({
      xAxis: {
        type: "time",
        data: allMessages.value.map((message) => new Date(message.timestamp)),
      },
      series: series,
    });
  }
};

const updateResponseTimeChart = () => {
  if (responseTimeChart && allMessages.value.length > 0) {
    const series = [];

    // 添加基础响应时间系列（中位数和95百分位）
    series.push({
      name: "Median Response Time",
      type: "line",
      data: allMessages.value.map((message) => [
        message.timestamp,
        message.median_response_time,
      ]),
      showInLegend: true,
      itemStyle: {
        normal: {
          opacity: selectedResponseTimes.value.includes("Median Response Time")
            ? 1
            : 0,
        },
      },
      lineStyle: {
        opacity: selectedResponseTimes.value.includes("Median Response Time")
          ? 1
          : 0,
      },
    });

    series.push({
      name: "95th Percentile Response Time",
      type: "line",
      data: allMessages.value.map((message) => [
        message.timestamp,
        message.response_time_95,
      ]),
      showInLegend: true,
      itemStyle: {
        normal: {
          opacity: selectedResponseTimes.value.includes(
            "95th Percentile Response Time"
          )
            ? 1
            : 0,
        },
      },
      lineStyle: {
        opacity: selectedResponseTimes.value.includes(
          "95th Percentile Response Time"
        )
          ? 1
          : 0,
      },
    });

    // 为每个API结果添加响应时间系列
    allMessages.value[0].api_results.forEach((apiResult) => {
      // 中位数响应时间系列
      series.push({
        name: `${apiResult.name} Median Response Time`,
        type: "line",
        data: allMessages.value.map((message) => {
          const result = message.api_results.find(
            (result) => result.name === apiResult.name
          );
          return result
            ? [message.timestamp, result.median_response_time]
            : [message.timestamp, 0];
        }),
        showInLegend: true,
        itemStyle: {
          normal: {
            opacity: selectedResponseTimes.value.includes(
              `${apiResult.name} Median Response Time`
            )
              ? 1
              : 0,
          },
        },
        lineStyle: {
          opacity: selectedResponseTimes.value.includes(
            `${apiResult.name} Median Response Time`
          )
            ? 1
            : 0,
        },
      });

      // 95百分位响应时间系列
      series.push({
        name: `${apiResult.name} 95th Percentile Response Time`,
        type: "line",
        data: allMessages.value.map((message) => {
          const result = message.api_results.find(
            (result) => result.name === apiResult.name
          );
          return result
            ? [message.timestamp, result.response_time_95]
            : [message.timestamp, 0];
        }),
        showInLegend: true,
        itemStyle: {
          normal: {
            opacity: selectedResponseTimes.value.includes(
              `${apiResult.name} 95th Percentile Response Time`
            )
              ? 1
              : 0,
          },
        },
        lineStyle: {
          opacity: selectedResponseTimes.value.includes(
            `${apiResult.name} 95th Percentile Response Time`
          )
            ? 1
            : 0,
        },
      });
    });

    // 更新图表
    responseTimeChart.setOption({
      xAxis: {
        type: "time",
        data: allMessages.value.map((message) => new Date(message.timestamp)),
      },
      series: series,
    });
  }
};

onMounted(() => {
  rpsChart = echarts.init(chartRPS.value);
  responseTimeChart = echarts.init(chartResponseTime.value);
  Concurrent_numberChart = echarts.init(Concurrent_number.value);
  rpsChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["RPS"] },
    xAxis: { type: "category", boundaryGap: false, data: [] },
    yAxis: { type: "value" },
    series: [{ name: "RPS", type: "line", data: [] }],
  });
  Concurrent_numberChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["concurrent_number"] },
    xAxis: { type: "category", boundaryGap: false, data: [] },
    yAxis: { type: "value" },
    series: [{ name: "concurrent_number", type: "line", data: [] }],
  });
  responseTimeChart.setOption({
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", boundaryGap: false, data: [] },
    yAxis: { type: "value" },
    series: [
      { name: "Median Response Time", type: "line", data: [] },
      { name: "95th Percentile Response Time", type: "line", data: [] },
    ],
  });
});

watch(
  () => props.receivedMessage,
  (newVal) => {
    if (newVal) {
      allMessages.value.push(newVal);
      console.log("newVal", newVal);
      const newTimestamp = new Date(newVal.timestamp).toLocaleTimeString();
      rpsData.value.push({
        timestamp: newTimestamp,
        value: newVal.total_concurrent_number,
      });

      if (unSetRPSSelect.value.length === 0) {
        newVal.api_results.forEach((apiResult) => {
          unSetRPSSelect.value.push({
            name: `${apiResult.name} RPS`,
            label: `${apiResult.name} RPS`,
          });
        });
      }
      updateRPSChart();
      Concurrent_numberData.value.push({
        timestamp: newTimestamp,
        value: newVal.rps,
      });
      if (unSetConcurrent_numberSelect.value.length === 0) {
        newVal.api_results.forEach((apiResult) => {
          unSetConcurrent_numberSelect.value.push({
            name: `${apiResult.name} concurrent_number`,
            label: `${apiResult.name} concurrent_number`,
          });
        });
      }
      updateConcurrent_numberChart();
      error_rate.value = newVal.error_rate ? newVal.error_rate : 0;
      rps.value = newVal.rps ? newVal.rps : 0;
      total_requests.value = newVal.total_requests ? newVal.total_requests : 0;
      total_concurrent_number.value = newVal.total_concurrent_number
        ? newVal.total_concurrent_number
        : 0;
      medianData.value.push({
        timestamp: newTimestamp,
        value: newVal.median_response_time,
      });
      ninetyFifthData.value.push({
        timestamp: newTimestamp,
        value: newVal.response_time_95,
      });

      if (unSetSelect.value.length === 0) {
        newVal.api_results.forEach((apiResult) => {
          if (apiResult.name) {
            unSetSelect.value.push(
              {
                name: `${apiResult.name} Median Response Time`,
                label: `${apiResult.name} Median Response Time`,
              },
              {
                name: `${apiResult.name} 95th Percentile Response Time`,
                label: `${apiResult.name} 95th Percentile Response Time`,
              }
            );
          }
        });
      }

      // if (medianData.value.length > 20) medianData.value.shift();
      // if (ninetyFifthData.value.length > 20) ninetyFifthData.value.shift();
      updateResponseTimeChart();
    }
  },
  { deep: true }
);
// 监听selectedResponseTimes的变化
watch(
  selectedResponseTimes,
  () => {
    // 当选中的响应时间变化时，更新响应时间图表
    updateResponseTimeChart("selectChange");
  },
  {
    deep: true,
  }
);
watch(
  selectedRPS,
  () => {
    // 当选中的响应时间变化时，更新响应时间图表
    updateRPSChart("selectChange");
  },
  {
    deep: true,
  }
);
watch(
  selectConcurrent_number,
  () => {
    // 当选中的响应时间变化时，更新响应时间图表
    updateConcurrent_numberChart("selectChange");
  },
  {
    deep: true,
  }
);
</script>

<template>
  <WelcomeItem>
    <!-- <template #heading>错误率 </template> -->
    <div
      style="
        display: flex;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto;
        gap: 30px;
        width: 100%;
        align-items: center;
        text-align: center;
        padding: 0.5rem;
        height: 5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
      "
    >
      <el-statistic
        title="RPS"
        :precision="2"
        :value="outputRPS"
        style="flex: 1"
      />
      <el-statistic
        title="总并发量"
        :value="outputTotalConcurrentNumber"
        style="flex: 1"
      />
      <el-statistic
        title="错误率"
        :value="outputErrorRate"
        :precision="2"
        style="flex: 1"
      >
        <template #suffix>
          <span>%</span>
        </template>
      </el-statistic>
      <el-statistic
        title="总请求数量"
        :value="outputTotalRequests"
        style="flex: 1"
      />
    </div>
  </WelcomeItem>
  <WelcomeItem>
    <template #heading>RPS</template>
    <div
      style="
        width: 55%;
        float: left;
        margin-left: 20%;
        position: absolute;
        z-index: 99;
      "
    >
      <el-select
        v-model="selectedRPS"
        multiple
        size="small"
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="2"
        placeholder="请选择"
      >
        <el-option label="RPS" value="RPS"></el-option>
        <!-- 动态添加其他响应时间系列选项 -->

        <el-option
          v-for="option in unSetRPSSelect"
          :key="option.name"
          :label="option.label"
          :value="option.name"
        >
        </el-option>
      </el-select>
    </div>
    <div ref="chartRPS" style="width: 100%; height: 265px"></div>
  </WelcomeItem>
  <WelcomeItem>
    <template #heading>响应时间 </template>
    <div
      style="
        width: 55%;
        float: left;
        margin-left: 20%;
        position: absolute;
        z-index: 99;
      "
    >
      <el-select
        v-model="selectedResponseTimes"
        multiple
        size="small"
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="2"
        placeholder="请选择"
      >
        <el-option
          label="中位响应时间"
          value="Median Response Time"
        ></el-option>
        <el-option
          label="95百分位响应时间"
          value="95th Percentile Response Time"
        ></el-option>
        <!-- 动态添加其他响应时间系列选项 -->

        <el-option
          v-for="option in unSetSelect"
          :key="option.name"
          :label="option.label"
          :value="option.name"
        >
        </el-option>
      </el-select>
    </div>
    <div ref="chartResponseTime" style="width: 100%; height: 265px"></div>
  </WelcomeItem>
  <WelcomeItem>
    <template #heading>并发量</template>
    <div
      style="
        width: 55%;
        float: left;
        margin-left: 20%;
        position: absolute;
        z-index: 99;
      "
    >
      <el-select
        v-model="selectConcurrent_number"
        multiple
        size="small"
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="2"
        placeholder="请选择"
      >
        <el-option
          label="total_concurrent_number"
          value="total_concurrent_number"
        ></el-option>
        <!-- 动态添加其他响应时间系列选项 -->

        <el-option
          v-for="option in unSetConcurrent_numberSelect"
          :key="option.name"
          :label="option.label"
          :value="option.name"
        >
        </el-option>
      </el-select>
    </div>
    <div ref="Concurrent_number" style="width: 100%; height: 265px"></div>
  </WelcomeItem>
</template>
<style scoped>
.flex-row {
  display: flex;
  width: 100%; /* 确保内部容器宽度与外部容器相同 */
  justify-content: space-around; /* 第二行的元素水平分布 */
}
.flex-item {
  margin: 10px; /* 为元素提供一些空间 */
}
</style>
