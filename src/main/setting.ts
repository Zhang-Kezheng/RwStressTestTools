import { app } from 'electron'

export async function appVersion(): Promise<string> {
  return app.getVersion()
}
