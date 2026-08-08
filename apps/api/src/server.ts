import app from "./app.js";
import { env } from "@s3forge/config";

app.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`)
})
