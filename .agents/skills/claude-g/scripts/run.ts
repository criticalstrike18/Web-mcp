import { spawn } from "node:child_process";

export async function runClaudeG(prompt: string, cwd = "D:/Webmcp"): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("claude-g.cmd", ["-p", prompt], {
      cwd,
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`claude-g exited with code ${code}: ${stderr}`));
      }
    });
  });
}

if (import.meta.main) {
  const prompt = process.argv.slice(2).join(" ") || "Audit the current workspace state";
  console.log(`[Running Claude-G Harness] Prompt: "${prompt}"`);
  runClaudeG(prompt).catch(console.error);
}
