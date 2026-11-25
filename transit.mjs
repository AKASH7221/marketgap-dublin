const status = document.getElementById("transitStatus");
const list = document.getElementById("transitNotices");

async function showNotices() {
  try {
    const response = await fetch("./transit.json");
    if (!response.ok) throw Error("No transport snapshot");
    const { checkedAt, notices } = await response.json();
    const timestamp = Date.parse(checkedAt);
    if (!Number.isFinite(timestamp) || !Array.isArray(notices)) throw Error("Invalid transport snapshot");
    const local = new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Dublin" }).format(timestamp);
    const stale = Date.now() - timestamp > 36 * 60 * 60 * 1000;
    status.textContent = (stale ? "Update overdue. " : "") + "Last checked " + local + " (Dublin time)."
      + (notices.length ? "" : " No matching notices appeared in that check.");
    list.replaceChildren(...notices.map(({ title, operator }) => {
      const row = document.createElement("li");
      row.textContent = operator ? title + " · " + operator : title;
      return row;
    }));
  } catch {
    status.textContent = "No daily snapshot is available yet. Check Transport for Ireland for current notices.";
  }
}
showNotices();
