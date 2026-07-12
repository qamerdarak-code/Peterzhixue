const fs = require("node:fs");
const path = require("node:path");

function sharedMemory() {
  if (!globalThis.__PETER_AI_STORE__) globalThis.__PETER_AI_STORE__ = new Map();
  return globalThis.__PETER_AI_STORE__;
}

class DataStore {
  constructor(config, options = {}) {
    this.url = config.url || "";
    this.token = config.token || "";
    this.localFile = path.resolve(process.cwd(), config.localFile || ".data/ai-store.json");
    this.production = Boolean(config.production);
    this.fetchImpl = options.fetchImpl || global.fetch;
    this.memory = options.memory || sharedMemory();
    this.mode = this.url && this.token ? "redis" : this.production ? "memory" : "file";
  }

  async command(parts) {
    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parts),
    });
    if (!response.ok) throw new Error(`Data store unavailable (${response.status})`);
    const payload = await response.json();
    if (payload.error) throw new Error("Data store command failed");
    return payload.result;
  }

  readLocal() {
    if (!fs.existsSync(this.localFile)) return {};
    try {
      return JSON.parse(fs.readFileSync(this.localFile, "utf8"));
    } catch {
      return {};
    }
  }

  writeLocal(data) {
    fs.mkdirSync(path.dirname(this.localFile), { recursive: true });
    const temporary = `${this.localFile}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data), "utf8");
    fs.renameSync(temporary, this.localFile);
  }

  pruneEntry(entry) {
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) return null;
    return entry;
  }

  async get(key) {
    if (this.mode === "redis") return this.command(["GET", key]);
    if (this.mode === "memory") {
      const entry = this.pruneEntry(this.memory.get(key));
      if (!entry) this.memory.delete(key);
      return entry?.value ?? null;
    }
    const data = this.readLocal();
    const entry = this.pruneEntry(data[key]);
    if (!entry && data[key]) {
      delete data[key];
      this.writeLocal(data);
    }
    return entry?.value ?? null;
  }

  async set(key, value, ttlSeconds = 0) {
    if (this.mode === "redis") {
      const command = ["SET", key, value];
      if (ttlSeconds) command.push("EX", ttlSeconds);
      await this.command(command);
      return;
    }
    const entry = {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
    };
    if (this.mode === "memory") {
      this.memory.set(key, entry);
      return;
    }
    const data = this.readLocal();
    data[key] = entry;
    this.writeLocal(data);
  }

  async getJson(key) {
    const value = await this.get(key);
    if (value === null || value === undefined) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async setJson(key, value, ttlSeconds = 0) {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async increment(key, ttlSeconds) {
    if (this.mode === "redis") {
      const count = Number(await this.command(["INCR", key]));
      if (count === 1 && ttlSeconds) await this.command(["EXPIRE", key, ttlSeconds]);
      return count;
    }
    const current = Number(await this.get(key)) || 0;
    const next = current + 1;
    await this.set(key, String(next), ttlSeconds);
    return next;
  }
}

module.exports = { DataStore };
