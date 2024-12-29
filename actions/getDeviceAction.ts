'use server'

import { getDevices, GetDevicesOptions } from "@/lib/data/devices"


export async function getDevicesAction(options: GetDevicesOptions) {
  try {
    const result = await getDevices(options)
    return { success: true, data: result }
  } catch (error) {
    console.error("Error in getDevicesAction:", error)
    return { success: false, error: (error as Error).message }
  }
}


