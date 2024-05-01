<script setup>
import TheItem from "../components/TheItem.vue";

import mainView from "../components/MainView.vue";

import { onMounted, ref, onUnmounted } from "vue";
import axios from "axios";
import { ElNotification } from "element-plus";
import { nanoid } from "nanoid";
const debounceTimer = ref(null);
const wsWorker = ref(null);

const message = ref("");
const history = ref([]);
const historyLoaded = ref(false);
const httpIsError = ref(false);
const assertIsError = ref(false);
const buttonShow = ref(false);
const httpData = ref([]);
const assertData = ref([]);
const api_resultsData = ref([]);
const hostname = window.location.hostname; // 获取当前页面的域名或IP地址
const port = window.location.port; // 获取当前页面的端口号
const baseURL = `${hostname}${port ? ":" + port : ""}`; // 拼接域名和端口号
// const baseURL = "localhost:8001";
// const baseURL = "127.0.0.1:8001";
// const ws = new WebSocket(`ws://${baseURL}/ws/${nanoid(8)}`);

let heartbeatTimer;
onMounted(async () => {
  wsWorker.value = new Worker(new URL("./worker.js", import.meta.url));
  wsWorker.value.postMessage({
    action: "start",
    baseURL: baseURL,
    nanoid: nanoid(8),
  });

  wsWorker.value.onmessage = (event) => {
    const { type, data } = event.data;
    switch (type) {
      case "message":
        if (isValidJSON(data)) {
          const jsonData = JSON.parse(data);
          message.value = jsonData;
          // 更新 Vue 状态
          httpData.value = jsonData.http_errors;
          assertData.value = jsonData.assert_errors;
          api_resultsData.value = jsonData.api_results;
          httpIsError.value = !!httpData.value.length;
          assertIsError.value = !!assertData.value.length;
        } else {
          switch (data) {
            case "DONE":
              ElNotification.success({ title: "压测完成", duration: 0 });
              break;
          }
        }
        break;
      case "open":
        console.log("WebSocket in Worker opened");
        break;
      case "close":
        console.log("WebSocket in Worker closed");
        break;
      case "error":
        console.error("WebSocket error from Worker:", data.error);
        break;
    }
  };
  await getHistory();
  if (history.value.length > 0) {
    let latestHistoryItem = history.value[history.value.length - 1];
    api_resultsData.value = latestHistoryItem.api_results;
    httpData.value = latestHistoryItem.http_errors;
    assertData.value = latestHistoryItem.assert_errors;
    httpIsError.value = !!httpData.value.length;
    assertIsError.value = !!assertData.value.length;
  }
});
function isValidJSON(text) {
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    return false;
  }
}
const formatPrice = (row, column, cellValue, index) => {
  // 检查值是否为数字，如果不是数字，则直接返回原值
  if (isNaN(cellValue)) {
    return cellValue;
  }

  // 将数值转换为固定的小数点表示法，保留两位小数
  return Number(cellValue).toFixed(2);
};
const formatPriceWithPercentage = (row, column, cellValue, index) => {
  if (cellValue === 0.0) {
    return "-";
  }
  const formattedValue = formatPrice(row, column, cellValue, index);
  return `${formattedValue}%`;
};

const getColor = (value) => {
  if (value < 10) {
    return "green";
  } else if (value < 50) {
    return "orange";
  } else {
    return "red";
  }
};

const downloadObjectAsJson = (exportObj, exportName) => {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

const debounceRun = () => {
  clearTimeout(debounceTimer.value); // 清除现有的计时器
  debounceTimer.value = setTimeout(run, 1000); // 重新设置计时器
};
// onUnmounted(() => {
//   ws.close(); // 关闭 WebSocket 连接
//   clearInterval(heartbeatTimer);
// });

onUnmounted(() => {
  if (wsWorker.value) {
    wsWorker.value.postMessage({ action: "close" });
  }
});

const run = async () => {
  if (buttonShow.value) {
    buttonShow.value = false;
    const response = await axios.get(`http://${baseURL}/run`);
    console.log("response", response.data);
    if (response.data.success) {
      ElNotification.success({ title: response.data.message || "压测开始" });
    } else {
      ElNotification.warning({
        title: response.data.message || "任务启动失败",
      });
    }
  } else {
    const response = await axios.get(`http://${baseURL}/history`);
    downloadObjectAsJson(response.data, Date.now());
  }
};
async function updateMessageAsync() {
  for (let i = 0; i < history.value.length; i++) {
    // 使用Promise和setTimeout来延迟更新message.value
    await new Promise((resolve) => setTimeout(resolve, 0));
    message.value = history.value[i];
  }
}
const getHistory = async () => {
  // console.log(historyJson);
  const response = await axios.get(`http://${baseURL}/history`);
  // const response = await axios.get(`http://localhost:8000/history`);
  if (response.data.length === 0) {
    buttonShow.value = true;
  }
  history.value = response.data;
  // history.value = historyJson;
  // await updateMessageAsync();
  historyLoaded.value = true;
};
</script>

<template>
  <header>
    <div style="display: flex; align-items: center">
      <img
        alt="Vue logo"
        class="logo"
        src="@/assets/atomic-bomb-engine-logo.png"
        width="125"
        height="125"
      />
      <mainView msg="压测报告" />
    </div>

    <div class="wrapper">
      <!-- <nav>
        <RouterLink to="/">2D</RouterLink>
        <RouterLink to="/about">3D</RouterLink>
      </nav> -->

      <div class="login-box" @click="debounceRun">
        <a href="#">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          {{ buttonShow ? "开始" : "导出结果" }}
        </a>
      </div>
    </div>
    <main>
      <TheItem :receivedMessage="message" :receivedMessageList="history" />
    </main>

    <el-divider border-style="dashed">
      <span>数据统计</span>
    </el-divider>

    <el-space direction="vertical" :size="35">
      <div v-if="httpIsError">
        <h3>HTTP错误</h3>
        <el-table :data="httpData" style="width: 90rem" :stripe="true">
          <el-table-column
            prop="name"
            label="名称"
            show-overflow-tooltip
            width="140px"
          />
          <el-table-column
            prop="host"
            label="HOST"
            show-overflow-tooltip
            width="180px"
          />
          <el-table-column
            prop="path"
            label="PATH"
            show-overflow-tooltip
            width="220px"
          />
          <el-table-column
            prop="code"
            label="状态码"
            show-overflow-tooltip
            width="80px"
            :formatter="(row) => (row.code === 0 ? '-' : row.code)"
          />
          <el-table-column
            prop="message"
            label="错误信息"
            show-overflow-tooltip
          />
          <el-table-column
            prop="source"
            label="来源"
            show-overflow-tooltip
            width="280px"
          />
          <el-table-column prop="count" label="次数" width="120px" />
        </el-table>
      </div>
      <div v-if="assertIsError">
        <h3>断言错误</h3>
        <el-table
          :data="assertData"
          style="width: 90rem; margin-top: 1rem"
          :stripe="true"
        >
          <el-table-column
            prop="name"
            label="名称"
            show-overflow-tooltip
            width="140px"
          />
          <el-table-column
            prop="host"
            label="HOST"
            show-overflow-tooltip
            width="180px"
          />
          <el-table-column
            prop="path"
            label="PATH"
            show-overflow-tooltip
            width="220px"
          />
          <el-table-column
            prop="message"
            label="错误信息"
            show-overflow-tooltip
          />
          <el-table-column prop="count" label="次数" width="120px" />
        </el-table>
      </div>
      <div>
        <h3>接口详情</h3>
        <el-table
          :data="api_resultsData"
          style="width: 90rem; margin-top: 1rem"
          :stripe="true"
        >
          <el-table-column
            prop="name"
            label="名称"
            show-overflow-tooltip
            width="140px"
          />
          <el-table-column prop="host" label="HOST" show-overflow-tooltip width="140px"/>
          <el-table-column prop="path" label="PATH" show-overflow-tooltip width="160px"/>
          <el-table-column prop="method" label="请求方法" width="80px"/>
          <el-table-column prop="rps" label="RPS" :formatter="formatPrice" />
          <el-table-column prop="total_requests" label="总请求数" />
          <el-table-column prop="err_count" label="错误数量" />
          <el-table-column prop="error_rate" label="错误率" width="90px">
            <template v-slot:default="scope">
              <span :style="{ color: getColor(scope.row.error_rate) }">
                {{
                  formatPriceWithPercentage(
                    scope.row,
                    "error_rate",
                    scope.row.error_rate,
                    scope.$index
                  )
                }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="min_response_time" label="最小响应时间(ms)" />
          <el-table-column prop="max_response_time" label="最大响应时间(ms)" />
          <el-table-column
            prop="median_response_time"
            label="中位响应时间(ms)"
          />
          <el-table-column prop="response_time_95" label="95位响应时间(ms)" />
          <el-table-column prop="response_time_99" label="99位响应时间(ms)" />
          <el-table-column
            prop="throughput_per_second_kb"
            label="每秒响应数据（kb）"
            :formatter="formatPrice"
          />
          <el-table-column
            prop="total_data_kb"
            label="总响应数据量（kb）"
            :formatter="formatPrice"
            width="100px"
          />
        </el-table>
      </div>
    </el-space>
    <footer>
      powered by
      <a
        href="https://github.com/qyzhg/atomic-bomb-engine-py?tab=readme-ov-file"
        target="_blank"
        rel="noopener"
        >atomic-bomb-engine</a
      >.
    </footer>
  </header>
</template>
<style scoped>
.is-disabled {
  background-color: grey !important;
  cursor: not-allowed;
}
.login-box {
  position: absolute;
  top: 0px;
  right: 4rem;
}
.login-box a {
  position: relative;
  display: inline-block;
  padding: 10px 20px;
  color: #fff;
  font-size: 16px;
  text-decoration: none;
  text-transform: uppercase;
  overflow: hidden;
  transition: 0.5s;
  margin-top: 40px;
  letter-spacing: 4px;
  background: #1ab188;
  /* background: #03e9f4; */
}

.login-box a:hover {
  background: #03e9f4;
  color: #fff;
  border-radius: 5px;
  box-shadow: 0 0 5px #03e9f4, 0 0 25px #03e9f4, 0 0 50px #03e9f4,
    0 0 100px #03e9f4;
}

.login-box a span {
  position: absolute;
  display: block;
}

.login-box a span:nth-child(1) {
  top: 0;
  left: -100%;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #03e9f4);
  animation: btn-anim1 1s linear infinite;
}

@keyframes btn-anim1 {
  0% {
    left: -100%;
  }
  50%,
  100% {
    left: 100%;
  }
}

.login-box a span:nth-child(2) {
  top: -100%;
  right: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, transparent, #03e9f4);
  animation: btn-anim2 1s linear infinite;
  animation-delay: 0.25s;
}

@keyframes btn-anim2 {
  0% {
    top: -100%;
  }
  50%,
  100% {
    top: 100%;
  }
}

.login-box a span:nth-child(3) {
  bottom: 0;
  right: -100%;
  width: 100%;
  height: 2px;
  background: linear-gradient(270deg, transparent, #03e9f4);
  animation: btn-anim3 1s linear infinite;
  animation-delay: 0.5s;
}

@keyframes btn-anim3 {
  0% {
    right: -100%;
  }
  50%,
  100% {
    right: 100%;
  }
}

.login-box a span:nth-child(4) {
  bottom: -100%;
  left: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(360deg, transparent, #03e9f4);
  animation: btn-anim4 1s linear infinite;
  animation-delay: 0.75s;
}

@keyframes btn-anim4 {
  0% {
    bottom: -100%;
  }
  50%,
  100% {
    bottom: 100%;
  }
}

main {
  /* display: flex; */
}
header {
  padding-top: 10px;
  line-height: 1.5;
  max-height: 100vh;
}
footer {
  margin-top: 1.5rem;
  text-align: center;
}
.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 0rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    /* display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);*/
  }

  .logo {
    margin: 0 2rem 0 0;

    display: inline-block;
  }

  header .wrapper {
    /* display: flex;
    place-items: flex-start; */
    flex-wrap: wrap;
    display: inline-block;
  }

  nav {
    text-align: left;
    margin-left: -0.5rem;
    font-size: 1rem;
    padding: 1rem 0;
    margin-top: 0rem;
  }
}
</style>
