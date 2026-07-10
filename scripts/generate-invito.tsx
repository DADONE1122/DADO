import React from "react"
import { ImageResponse } from "@vercel/og"
import fs from "fs"
import path from "path"

const IMAGE_WIDTH = 1315
const IMAGE_HEIGHT = 632

const templatePath = path.join(process.cwd(), "public", "invito-template.png")
const fontPath = path.join(process.cwd(), "public", "fonts", "Caveat-VariableFont_wght.ttf")

const templateBuffer = fs.readFileSync(templatePath)
const templateBase64 = templateBuffer.toString("base64")
const templateDataUri = `data:image/png;base64,${templateBase64}`
const fontBuffer = fs.readFileSync("/tmp/DancingScript-Bold.ttf")

async function main() {
  const resp = new ImageResponse(
    (
      <div
        style={{
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          display: "flex",
          position: "relative",
          backgroundImage: `url(${templateDataUri})`,
          backgroundSize: `${IMAGE_WIDTH}px ${IMAGE_HEIGHT}px`,
        }}
      >
        <div style={{ position: "absolute", left: "408px", top: "303px", fontSize: 36, color: "#2B2B6B", fontFamily: "Caveat", textAlign: "center", transform: "translate(-50%,-50%)", whiteSpace: "nowrap" }}>
          14 settembre
        </div>
        <div style={{ position: "absolute", left: "750px", top: "303px", fontSize: 36, color: "#2B2B6B", fontFamily: "Caveat", textAlign: "center", transform: "translate(-50%,-50%)", whiteSpace: "nowrap" }}>
          15:30
        </div>
        <div style={{ position: "absolute", left: "658px", top: "398px", fontSize: 42, color: "#2B2B6B", fontFamily: "Caveat", textAlign: "center", transform: "translate(-50%,-50%)", whiteSpace: "nowrap" }}>
          Luca
        </div>
        <div style={{ position: "absolute", left: "658px", top: "468px", fontSize: 28, color: "#2B2B6B", fontFamily: "Caveat", textAlign: "center", transform: "translate(-50%,-50%)", whiteSpace: "nowrap" }}>
          333 1234567
        </div>
      </div>
    ),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      fonts: [
        {
          name: "Caveat",
          data: fontBuffer,
          weight: 700,
          style: "normal",
        },
      ],
    }
  )

  const buf = await resp.arrayBuffer()
  fs.writeFileSync("/tmp/invito-test.png", Buffer.from(buf))
  console.log("Generated:", buf.byteLength, "bytes")
}

main().catch(console.error)