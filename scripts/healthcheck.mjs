const response = await fetch("http://127.0.0.1:3000/api/health", {
  signal: AbortSignal.timeout(2500),
});

if (!response.ok) {
  throw new Error(`Health endpoint returned ${response.status}.`);
}

const body = await response.json();

if (body.status !== "ok") {
  throw new Error("Health endpoint returned an unexpected body.");
}