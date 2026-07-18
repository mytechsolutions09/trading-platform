export function Journal() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#08080f",
        overflow: "hidden",
      }}
    >
      <iframe
        src="/journal/index.html"
        title="Trading Journal"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
      />
    </div>
  );
}
