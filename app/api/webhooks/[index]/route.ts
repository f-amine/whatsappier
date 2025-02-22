import { NextResponse } from "next/server";
import crypto from "crypto";


export async function POST(
  request: Request,
  { params }: { params: { index: string } },
) {
  const body = await request.json();
  console.log(body)

}
