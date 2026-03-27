import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Upload, Pencil, Loader2, FileText, AlertTriangle, Shield, Leaf, ExternalLink, X, Search } from "lucide-react";
import DocViewer from "../components/scan/DocViewer";
import PageHeader from "../components/shared/PageHeader";
import ScanViewfinder from "../components/scan/ScanViewfinder";
import UnitCard from "../components/scan/UnitCard";
import { decodeSerialYear } from "../components/scan/serialDecoder";
import { AppState } from "../components/appState";


const INPUT_STYLE = {
  background: "#161c1c", color: "#cce0e0",
  border: "1px solid #1e2828", borderRadius: 10,
  padding: "12px 14px", fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 13, outline: "none", width: "100%",
};

export default function ScanUnitPage() {
  const [unitData, setUnitData]       = useState(() => AppState.get('scan_unitData'));
  const [knownIssues, setKnownIssues] = useState(() => AppState.get('scan_knownIssues'));
  const [documents, setDocuments]     = useState(() => AppState.get('scan_documents'));
  const [isScanning, setIsScanning]       = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs]     = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [manualForm, setManualForm] = useState({ brand: "", model_number: "", serial_number: "", unit_type: "", age: 10 });
  const fileInputRef   = useRef(null);
  const uploadInputRef = useRef(null);

  // Persist to AppState on every change
  useEffect(() => { AppState.set('scan_unitData',    unitData);    }, [unitData]);
  useEffect(() => { AppState.set('scan_knownIssues', knownIssues); }, [knownIssues]);
  useEffect(() => { AppState.set('scan_documents',   documents);   }, [documents]);

  const clearUnit = () => {
    setUnitData(null);
    setKnownIssues(null);
    setDocuments(null);
  };

  const processImage = async (file) => {
    setIsScanning(true);
    setUnitData(null); setKnownIssues(null); setDocuments(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: "Extract from this HVAC nameplate and return only raw JSON no markdown: brand, model_number, serial_number, unit_type, tonnage, btuh, voltage, phase, amps_rla, amps_mca, amps_mop, refrigerant_type, charge_oz, seer, manufacture_date. Use null for any field not visible.",
      file_urls: [file_url],
      model: "claude_sonnet_4_6",
      max_tokens: 350,
      response_json_schema: {
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
    window.__trackCredit?.();

    const data = { ...extracted, nameplate_image_url: file_url };
    if (data.brand && data.serial_number && !data.manufacture_date) {
      const year = decodeSerialYear(data.brand, data.serial_number);
      if (year) data.manufacture_date = String(year);
    }
    if (data.manufacture_date) {
      data.unit_age = new Date().getFullYear() - parseInt(data.manufacture_date);
    }

    setUnitData(data);
    setIsScanning(false);
  };

  const loadKnownIssues = async () => {
    if (!unitData) return;
    setIsLoadingIssues(true);
    const age = unitData.unit_age || unitData.age || "unknown";
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `For a ${unitData.brand || "unknown"} ${unitData.unit_type || "HVAC unit"} that is ${age} years old, list the 4 most common failure points. Plain field language.`,
      model: "claude_sonnet_4_6",
      max_tokens: 250,
    });
    window.__trackCredit?.();
    setKnownIssues(result);
    setIsLoadingIssues(false);
  };

  const loadDocuments = async () => {
    if (!unitData?.model_number) return;
    setIsLoadingDocs(true);
    const model = unitData.model_number;
    const brand = unitData.brand;

    const brandUrls = {
      carrier: "carrier.com/residential/en/us/support",
      bryant: "bryant.com/en/us/support",
      trane: "trane.com/residential/en/resources",
      "american standard": "americanstandardair.com/support",
      lennox: "lennox.com/resources",
      goodman: "goodmanmfg.com/resources",
      amana: "amana-hac.com/resources",
      rheem: "rheem.com/support",
      ruud: "ruud.com/support",
      york: "york.com/support",
      daikin: "daikincomfort.com/support",
      mitsubishi: "mitsubishielectric.us/hvac/support",
    };
    const brandKey = (brand || "").toLowerCase();
    const mfgUrl = brandUrls[brandKey] || null;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find technical documents for model "${model}" (brand: "${brand || "unknown"}"). Search ManualsLib, manufacturer site${mfgUrl ? ` (${mfgUrl})` : ""}, hvac-talk.com, encompassparts.com. Return document_type, url, source. If none found, return search links prefixed "Search — " for: ManualsLib (https://www.manualslib.com/search/?q=${encodeURIComponent(model)}), Manufacturer, HVAC-Talk (https://hvac-talk.com/vbb/search.php?query=${encodeURIComponent(model)}), EncompassParts (https://www.encompassparts.com/search?term=${encodeURIComponent(model)}).`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      max_tokens: 150,
      response_json_schema: {
        type: "object",
        properties: {
          documents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                document_type: { type: "string" },
                url: { type: "string" },
                source: { type: "string" },
              }
            }
          }
        }
      }
    });
    window.__trackCredit?.();
    setDocuments(result?.documents || null);
    setIsLoadingDocs(false);
  };

  const handleCapture = () => fileInputRef.current?.click();
  const handleUpload  = () => uploadInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  };

  const handleManualSubmit = async () => {
    if (!manualForm.model_number.trim()) return;
    setIsScanning(true);
    setUnitData(null); setKnownIssues(null); setDocuments(null);
    setShowManual(false);

    const extracted = await base44.integrations.Core.InvokeLLM({
      prompt: `Given model number "${manualForm.model_number}", look up and return: brand, unit_type, refrigerant_type, tonnage, btuh, voltage, seer, manufacture_date (year only), phase, amps_rla, amps_mca, amps_mop, charge_oz. Only return what's confidently determinable.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      max_tokens: 350,
      response_json_schema: {
        type: "object",
        properties: {
          brand: { type: "string" },
          unit_type: { type: "string" },
          refrigerant_type: { type: "string" },
          tonnage: { type: "string" },
          btuh: { type: "string" },
          voltage: { type: "string" },
          seer: { type: "string" },
          manufacture_date: { type: "string" },
          phase: { type: "string" },
          amps_rla: { type: "string" },
          amps_mca: { type: "string" },
          amps_mop: { type: "string" },
          charge_oz: { type: "string" },
        }
      }
    });
    window.__trackCredit?.();

    const data = {
      ...extracted,
      model_number: manualForm.model_number,
      serial_number: manualForm.serial_number || null,
    };

    if (data.manufacture_date) {
      data.unit_age = new Date().getFullYear() - parseInt(data.manufacture_date);
    }

    setUnitData(data);
    setIsScanning(false);
  };


  const warrantyStatus = unitData?.unit_age != null ? (
    unitData.unit_age <= 5  ? { text: "LIKELY UNDER WARRANTY", color: "#00e09a" } :
    unitData.unit_age <= 10 ? { text: "CHECK REGISTRATION — MAY BE COVERED", color: "#ffc600" } :
    { text: "OUT OF WARRANTY", color: "#3d5555" }
  ) : null;

  const showR410aFlag = unitData?.refrigerant_type?.includes("410") && unitData?.unit_age >= 12;

  return (
    <div className="pb-4">
      <PageHeader title="SCAN UNIT" subtitle="Nameplate → full tech brief in seconds" />

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
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleUpload}
              className="py-3 rounded-xl font-condensed text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "#111515", color: "#cce0e0", border: "1px solid #1e2828" }}>
              <Upload className="w-4 h-4" /> UPLOAD IMAGE
            </button>
            <button onClick={() => setShowManual(!showManual)}
              className="py-3 rounded-xl font-condensed text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "#111515", color: "#cce0e0", border: "1px solid #1e2828" }}>
              <Pencil className="w-4 h-4" /> MANUAL ENTRY
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {/* Manual entry form */}
        {showManual && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#111515", border: "1px solid #1e2828" }}>
            <p className="font-mono" style={{ fontSize: 10, color: "#7a9898", letterSpacing: 1.5 }}>
              ENTER MODEL NUMBER — ALL UNIT INFO WILL BE LOOKED UP AUTOMATICALLY
            </p>
            <input
              placeholder="Model Number (e.g. 4TTR3036L1000A)"
              value={manualForm.model_number}
              onChange={(e) => setManualForm(p => ({ ...p, model_number: e.target.value }))}
              style={INPUT_STYLE}
            />
            <input
              placeholder="Serial Number (optional)"
              value={manualForm.serial_number}
              onChange={(e) => setManualForm(p => ({ ...p, serial_number: e.target.value }))}
              style={INPUT_STYLE}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualForm.model_number.trim()}
              className="btn-accent w-full py-3 rounded-xl flex items-center justify-center gap-2"
              style={{ opacity: !manualForm.model_number.trim() ? 0.45 : 1 }}>
              <Search size={15} /> LOOK UP UNIT
            </button>
          </div>
        )}

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

        {/* Known issues */}
        {unitData && (
          <div className="rounded-xl px-4 py-3" style={{ background: "#ffc60008", border: "1px solid #ffc60033" }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "#ffc600" }} />
              <p style={{ fontSize: 20, color: "#ffc600", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>KNOWN ISSUES</p>
            </div>
            {isLoadingIssues ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#ffc600" }} />
                <span className="font-mono" style={{ fontSize: 10, color: "#7a9898" }}>Looking up common failures...</span>
              </div>
            ) : knownIssues ? (
              <p className="font-body text-xs leading-relaxed whitespace-pre-line" style={{ color: "#7a9898" }}>
                {knownIssues}
              </p>
            ) : (
              <button onClick={loadKnownIssues}
                className="w-full py-2 rounded-lg font-mono text-xs"
                style={{ background: "#111515", color: "#ffc600", border: "1px solid #ffc60033" }}>
                LOAD KNOWN ISSUES
              </button>
            )}
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