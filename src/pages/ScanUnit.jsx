import React, { useState, useRef, useEffect } from "react";
import { llm, toBase64 } from '../api/client';
import { Camera, Upload, Loader2, FileText, Shield, Leaf, ExternalLink, X } from "lucide-react";
import DocViewer from "../components/scan/DocViewer";
import ScanViewfinder from "../components/scan/ScanViewfinder";
import UnitCard from "../components/scan/UnitCard";

const SCAN_STATE_KEY = 'scan_state_v1';

function loadScanState() {
  try { return JSON.parse(localStorage.getItem(SCAN_STATE_KEY) || 'null'); } catch { return null; }
}
function saveScanState(unitData, documents) {
  try { localStorage.setItem(SCAN_STATE_KEY, JSON.stringify({ unitData, documents })); } catch {}
}

export default function ScanUnitPage() {
  const saved = loadScanState();
  const [unitData, setUnitData]   = useState(() => saved?.unitData || null);
  const [documents, setDocuments] = useState(() => saved?.documents || null);
  const [isScanning, setIsScanning]   = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const fileInputRef   = useRef(null);
  const uploadInputRef = useRef(null);

  // Persist to localStorage on every change
  useEffect(() => { saveScanState(unitData, documents); }, [unitData, documents]);

  const clearUnit = () => {
    setUnitData(null);
    setDocuments(null);
  };

  const processImage = async (file) => {
    setIsScanning(true);
    setUnitData(null); setDocuments(null);

    const file_url = await toBase64(file);

    const extracted = await llm({
      prompt: "Extract from this HVAC nameplate and return only raw JSON no markdown: brand, model_number, serial_number, unit_type, tonnage, btuh, voltage, phase, amps_rla, amps_mca, amps_mop, refrigerant_type, charge_oz, seer, manufacture_date. Use null for any field not visible.",
      images: [file_url],
      model: "claude_sonnet_4_6",
      max_tokens: 350,
      json: {
        type: "object",
        properties: {
          brand: { type: "string" }, model_number: { type: "string" },
          serial_number: { type: "string" }, unit_type: { type: "string" },
          tonnage: { type: "string" }, btuh: { type: "string" },
          voltage: { type: "string" }, phase: { type: "string" },
          amps_rla: { type: "string" }, amps_mca: { type: "string" },
          amps_mop: { type: "string" }, refrigerant_type: { type: "string" },
          charge_oz: { type: "string" }, seer: { type: "string" },
          manufacture_date: { type: "string" },
        }
      }
    });

    const data = { ...extracted, nameplate_image_url: file_url };
    if (data.manufacture_date) {
      data.unit_age = new Date().getFullYear() - parseInt(data.manufacture_date);
    }

    setUnitData(data);
    setIsScanning(false);
  };

  const loadDocuments = async () => {
    if (!unitData?.brand) return;
    setIsLoadingDocs(true);
    try {
      const res = await fetch(
        `/api/find-manual?brand=${encodeURIComponent(unitData.brand)}&model=${encodeURIComponent(unitData.model_number || '')}`
      );
      const { manuals } = await res.json();
      setDocuments(manuals?.length > 0 ? manuals : []);
    } catch {
      setDocuments([]);
    }
    setIsLoadingDocs(false);
  };

  const handleCapture = () => fileInputRef.current?.click();
  const handleUpload  = () => uploadInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  };


  const warrantyStatus = unitData?.unit_age != null ? (
    unitData.unit_age <= 5  ? { text: "LIKELY UNDER WARRANTY", color: "#00e09a" } :
    unitData.unit_age <= 10 ? { text: "CHECK REGISTRATION — MAY BE COVERED", color: "#ffc600" } :
    { text: "OUT OF WARRANTY", color: "#3d5555" }
  ) : null;

  const showR410aFlag = unitData?.refrigerant_type?.includes("410") && unitData?.unit_age >= 12;

  return (
    <div className="pb-4">
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22, fontWeight: 900, color: "var(--text-primary)",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>SCAN UNIT</div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2,
        }}>Nameplate → full tech brief in seconds</div>
      </div>

      <div className="px-4 space-y-4">
        {/* Viewfinder */}
        <ScanViewfinder />

        {/* Action buttons */}
        <div className="space-y-2">
          <button onClick={handleCapture} disabled={isScanning}
            className="btn-accent w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2"
            style={{ boxShadow: isScanning ? "none" : "0 0 20px #ff620030" }}>
            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            {isScanning ? "READING NAMEPLATE..." : "PHOTOGRAPH NAMEPLATE"}
          </button>
          <button onClick={handleUpload}
            className="py-3 rounded-xl font-condensed text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "#111515", color: "#cce0e0", border: "1px solid #1e2828" }}>
            <Upload className="w-4 h-4" /> UPLOAD IMAGE
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />


        {/* Unit card with CLEAR button */}
        {unitData && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
              <button onClick={clearUnit} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#3d5555", fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: 5, padding: "4px 8px",
                borderRadius: 6,
              }}>
                <X size={10} /> CLEAR
              </button>
            </div>
            <UnitCard data={unitData} />
          </div>
        )}

        {/* Warranty status */}
        {warrantyStatus && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#111515", border: `1px solid ${warrantyStatus.color}33` }}>
            <Shield className="w-5 h-5 flex-shrink-0" style={{ color: warrantyStatus.color }} />
            <div>
              <p style={{ fontSize: 9, color: "#3d5555", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Orbitron', sans-serif" }}>
                WARRANTY STATUS
              </p>
              <p style={{ fontSize: 18, color: warrantyStatus.color, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>
                {warrantyStatus.text}
              </p>
            </div>
          </div>
        )}

        {/* R-410A transition flag */}
        {showR410aFlag && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: "#ff620015", border: "1px solid #ff6200" }}>
            <Leaf className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#ff6200" }} />
            <div>
              <p className="font-condensed font-bold" style={{ fontSize: 15, color: "#ff6200" }}>
                REFRIGERANT TRANSITION
              </p>
              <p className="font-body text-xs mt-1" style={{ color: "#7a9898" }}>
                R-410A is being phased out. New equipment ships with R-454B. At {unitData.unit_age} years old, this is a good time for the repair vs. replace conversation with the customer.
              </p>
            </div>
          </div>
        )}


        {/* Documents */}
        {unitData && (
          <div className="rounded-xl p-4" style={{ background: "#111515", border: "1px solid #1e2828" }}>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" style={{ color: "#7a9898" }} />
              <p className="font-condensed font-bold" style={{ fontSize: 15, color: "#cce0e0" }}>DOCUMENTS</p>
            </div>
            {isLoadingDocs ? (
              <div className="loading-breathe" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8,
              }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#ff6200" }} />
                <span className="font-mono" style={{ fontSize: 10, color: "#ff6200", letterSpacing: 1.5 }}>
                  SEARCHING FOR MANUALS...
                </span>
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="space-y-2">
                {documents.filter(d => d.url).map((doc, i) => {
                  const isSearch = doc.document_type?.toLowerCase().startsWith("search");
                  const isTip = doc.source?.toLowerCase() === "tip";
                  return (
                    <button key={i}
                      onClick={() => {
                        if (isTip) return;
                        if (isSearch) { window.open(doc.url, "_blank"); return; }
                        setViewingDoc(doc);
                      }}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-left"
                      style={{
                        background: isTip ? "#ff620008" : "#161c1c",
                        border: isTip ? "1px solid #ff620020" : "1px solid transparent",
                        cursor: isTip ? "default" : "pointer",
                      }}>
                      <div style={{ minWidth: 0 }}>
                        <span className="font-condensed font-semibold block" style={{
                          fontSize: 13, color: isTip ? "#7a9898" : "#cce0e0",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {doc.document_type}
                        </span>
                        <span className="font-mono block" style={{ fontSize: 9, color: "#3d5555", letterSpacing: 1 }}>
                          {doc.source?.toUpperCase()}
                        </span>
                      </div>
                      {!isTip && (
                        isSearch
                          ? <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: "#7a9898" }} />
                          : <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "#ff6200" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button onClick={loadDocuments}
                className="w-full py-2 rounded-lg font-mono text-xs"
                style={{ background: "#161c1c", color: "#7a9898", border: "1px solid #1e2828" }}>
                FIND DOCUMENTS
              </button>
            )}
          </div>
        )}

        {/* In-app document viewer */}
        {viewingDoc && (
          <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
        )}
      </div>
    </div>
  );
}
