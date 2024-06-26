self.addEventListener("message", function (e) {
  const { action, baseURL, nanoid } = e.data;
  const ws = new WebSocket(`ws://${baseURL}/ws/${nanoid}`);
  let heartbeatTimer;
  if (action === "start") {
    const startHeartbeat = () => {
      const heartbeatInterval = 3000; // 心跳间隔
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("PING");
        }
      }, heartbeatInterval);
    };

    ws.onopen = () => {
      console.log("WebSocket connection opened in worker");
      startHeartbeat();
      postMessage({ type: "open" });
    };

    ws.onmessage = (event) => {
      postMessage({ type: "message", data: event.data });
    };

    ws.onerror = (error) => {
      console.error("WebSocket error in worker:", error);
      postMessage({ type: "error", error: error.toString() });
    };

    ws.onclose = () => {
      clearInterval(heartbeatTimer);
      console.log("WebSocket connection closed in worker");
      postMessage({ type: "close" });
    };

    self.addEventListener("message", function (e) {
      if (e.data.action === "close") {
        ws.close();
      }
    });
  } else if (action === "close") {
    if (ws) {
      ws.close(); // 关闭 WebSocket 连接
      clearInterval(heartbeatTimer); // 清除心跳定时器
    }
  }
});
