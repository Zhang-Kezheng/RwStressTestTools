export type GatewayOption = {
  transport: string
  protocol: string
  ip: string
  port: number
  rate: number
  gateway_count: number
  tag_count: number
  prefix: string
}

export type MiddlewareOption = {
  transport: string
  protocol: string
  ip: string
  port: number
  rate: number
}
