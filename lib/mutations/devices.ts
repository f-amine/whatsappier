'use server'

import { prisma } from "../db"
import { getCurrentUser } from "../sessions"
import { getUserById } from "../user"


export interface WhatsappInstanceData {
  instanceName: string
  number: string
  qrcode: boolean
  integration: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'
  token?: string
  businessId?: string
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
  const user = await getCurrentUser();
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
  return {connected:true}
  
}
