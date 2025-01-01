'use server'

import { prisma } from "../db"
import { getCurrentUser } from "../sessions"
import { revalidatePath } from "next/cache"
import { statusMap } from "../utils"


export interface QRCodeResponse {
  base64: string
  code: string
  pairingCode: string
  count: number
}

export interface WhatsappInstanceData {
  instanceName: string
  number: string
  qrcode: boolean
  integration: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'
  token?: string
  businessId?: string
}

interface WhatsappDeleteResponse {
  status: "SUCCESS" | "ERROR"
  error: boolean
  response: {
    message: string
  }
}

interface WhatsappConnectionResponse {
  instance: {
    instanceName: string
    state: 'open' | 'connecting' | 'close' | 'refused'
  }
}

interface WhatsappInstanceResponse {
  instance: {
    instanceName: string
    instanceId: string
    webhook_wa_business: string | null
    access_token_wa_business: string
    status: 'created' | 'connected'
  }
  hash: string ,
  qrcode:{
    pairingCode: string
    code : string
    base64: string
    count: number
  }
  settings :{
    reject_call: boolean
    msg_call: string
    groups_ignore: boolean
    always_online: boolean
    read_messages: boolean
    read_status: boolean
    sync_full_history: boolean    
  }
}

export async function createWhatsappInstance(data: WhatsappInstanceData) {
  
  const user = await getCurrentUser();
  const response= await fetch(`${process.env.AP_WHATSAPPIER_SERVER_URL}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': `${process.env.AP_WHATSAPPIER_API_KEY}`
    },
    body: JSON.stringify(data)
  })
  const res = await response.json()
  if (!response.ok) {
    throw new Error(res.error)
  }

  const whatsappResponse = res as WhatsappInstanceResponse
  await prisma.device.create({
    data: {
      userId: user.id,
      name: whatsappResponse.instance.instanceName,
      phoneNumber: data.number,
      status: whatsappResponse.instance.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED',
      metadata: {
        qrcode: whatsappResponse.qrcode,
        settings: whatsappResponse.settings,
      },
    },
  })
  return res as Promise<WhatsappInstanceResponse>
}

export async function checkConnectionStatus(instanceName: string) {
  const response = await fetch(
    `${process.env.AP_WHATSAPPIER_SERVER_URL}/instance/connectionState/${instanceName}`,
    {
      method: 'GET',
      headers: {
        'apikey': `${process.env.AP_WHATSAPPIER_API_KEY}`
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to check connection status')
  }

  const result = await response.json() as WhatsappConnectionResponse
  
  const deviceStatus = statusMap[result.instance.state]

  await prisma.device.update({
      where: { 
        name: instanceName 
      },
      data: { 
        status:deviceStatus,
      }

    })


  return {
    success: true,
    connected: result.instance.state === 'open',
    status: deviceStatus,
  }
}
export async function logoutDeviceAction(deviceId: string) {
  // Get the device details first
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { 
      name: true,  // name is used as instance name
      status: true
    }
  })

  if (!device) {
    throw new Error("Device not found")
  }

  // Call WhatsApp API to logout
  const response = await fetch(
    `${process.env.AP_WHATSAPPIER_SERVER_URL}/instance/logout/${device.name}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': `${process.env.AP_WHATSAPPIER_API_KEY}`
      }
    }
  )

  const result = await response.json() as WhatsappDeleteResponse
  
  if (!response.ok || result.error) {
    throw new Error(result.response.message || 'Failed to logout device')
  }

  // Update device status in database
  await prisma.device.update({
    where: { id: deviceId },
    data: {
      status: 'DISCONNECTED',
      metadata: {
        // Clear any session-related metadata
        qrcode: null,
        settings: null,
      }
    }
  })

  revalidatePath('/devices')
  return { success: true }
}

export async function deleteDeviceAction(deviceId: string) {
  // Get the device details first
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { 
      name: true, 
      status: true
    }
  })

  if (!device) {
    throw new Error("Device not found")
  }
  // here disconnect the device first if it is connected

  if(device.status === 'CONNECTED'){
    await logoutDeviceAction(deviceId)
  }

  // Call WhatsApp API to delete instance
  const response = await fetch(
    `${process.env.AP_WHATSAPPIER_SERVER_URL}/instance/delete/${device.name}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': `${process.env.AP_WHATSAPPIER_API_KEY}`
      }
    }
  )

  const result = await response.json() as WhatsappDeleteResponse
  
  if (!response.ok || result.error) {
    throw new Error(result.response.message || 'Failed to delete device')
  }

  // Delete device from database
  await prisma.device.delete({
    where: { id: deviceId }
  })

  revalidatePath('/devices')
  return { success: true }

}

// Bulk delete action for multiple devices
export async function bulkDeleteDevicesAction(deviceIds: string[]) {
  const results = await Promise.allSettled(
    deviceIds.map(id => deleteDeviceAction(id))
  )

  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  )

  if (failures.length > 0) {
    throw new Error(`Failed to delete ${failures.length} devices`)
  }

  revalidatePath('/devices')
  return { success: true }
}
export async function connectDeviceAction(deviceName: string):Promise<QRCodeResponse> {
  const response = await fetch(
    `${process.env.AP_WHATSAPPIER_SERVER_URL}/instance/connect/${deviceName}`,
    {
      method: 'GET',
      headers: {
        'apikey': `${process.env.AP_WHATSAPPIER_API_KEY}`
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get connection QR code')
  }

  const result = await response.json() as QRCodeResponse


  // Update device status to CONNECTING
  await prisma.device.update({
    where: { name: deviceName },
    data: { 
      status: 'CONNECTING',
      metadata: {
        qrcode: result.base64
      }
    }
  })

  return result
}


