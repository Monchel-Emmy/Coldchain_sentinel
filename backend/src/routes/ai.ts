import { Router } from 'express';
import { isConnected } from '../db';
import { Fridge as FridgeModel } from '../models/Fridge';
import { Device as DeviceModel } from '../models/Device';
import { Vaccine as VaccineModel } from '../models/Vaccine';
import { HealthCenter as HealthCenterModel } from '../models/HealthCenter';
import { SensorReading as SensorReadingModel } from '../models/SensorReading';
import {
  fridges as memFridges,
  devices as memDevices,
  vaccines as memVaccines,
  healthCenters as memHC,
  latestReadings,
} from '../data/mockStore';
import { authenticate, getHCFilter, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Helper to get Gemini response using fetch
async function callGemini(contents: any[], systemInstructionText?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload: any = {
    contents,
  };

  if (systemInstructionText) {
    payload.systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };
  }

  const response = await (globalThis as any).fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Invalid response format from Gemini API');
  }

  return text;
}

// Smart local fallback generator for clinical recommendations
function getMockRecommendation(fridge: any, currentTemp: number | null, currentHumidity: number | null, vaccines: any[], hcName: string): string {
  const tempMin = fridge.targetTempMin ?? 2;
  const tempMax = fridge.targetTempMax ?? 8;
  const isFreezer = fridge.type === 'freezer' || fridge.name.toLowerCase().includes('freezer');

  if (currentTemp === null) {
    return `### ⚠️ No Reading Available\n\nNo active telemetry readings are detected for the storage unit **${fridge.name}** at **${hcName}**. \n\n**Recommended Steps:**\n1. **Check IoT Device Connection**: Verify if the ESP32 sensor node is powered on and connected to the local Wi-Fi network.\n2. **Manual Temperature Check**: Dispatch a clinic nurse to manually read the physical thermometer inside the unit.\n3. **Minimize Door Openings**: Keep the unit sealed until telemetry is restored or a manual reading confirms safety.`;
  }

  const tooHot = currentTemp > tempMax;
  const tooCold = currentTemp < tempMin;

  if (!tooHot && !tooCold) {
    return `### ✅ System Operating Normally\n\n**${fridge.name}** is currently operating at **${currentTemp}°C** with **${currentHumidity ?? 'N/A'}%** humidity, which is within the target range of **${tempMin}°C to ${tempMax}°C**.\n\n**Routine Guidance:**\n- **Door discipline**: Keep door openings to a minimum (<4 times daily).\n- **Daily logs**: Check and record manual safety thermometer readings twice daily.\n- **Inventory check**: Keep vaccines organized with space between boxes to allow adequate cold air circulation.`;
  }

  // Out of range situation
  let severity = 'HIGH';
  if (tooHot && currentTemp - tempMax > 5) severity = 'CRITICAL';
  if (tooCold && tempMin - currentTemp > 5) severity = 'CRITICAL';

  let alertMarkdown = `### 🚨 [${severity} ALERT] Temperature Excursion Detected on ${fridge.name}\n\n`;
  alertMarkdown += `The unit is currently at **${currentTemp}°C**, which is **out of range** (Target: **${tempMin}°C to ${tempMax}°C**). Immediate action is required to preserve vaccine efficacy at **${hcName}**.\n\n`;

  if (tooHot) {
    alertMarkdown += `#### 🌡️ Heat Threat Analysis:\n`;
    alertMarkdown += `- **Heat-Sensitive Vaccines at Risk**: `;
    const heatSensitive = vaccines.filter(v => ['opv', 'polio', 'measles', 'rubella', 'rotavirus', 'bcg'].includes(v.type?.toLowerCase() || v.name?.toLowerCase()));
    if (heatSensitive.length > 0) {
      alertMarkdown += heatSensitive.map(v => `**${v.name}** (${v.quantity} doses)`).join(', ');
      alertMarkdown += `. These vaccines degrade quickly at elevated temperatures.\n`;
    } else {
      alertMarkdown += `All vaccines in storage, especially live-attenuated formulations.\n`;
    }

    alertMarkdown += `\n#### 📋 Actionable Steps:\n`;
    alertMarkdown += `1. **Prepare Backup Storage**: Immediately prepare pre-conditioned vaccine carriers (cold boxes) with cold packs (2–8°C, do not use frozen packs directly against freeze-sensitive vaccines without conditioning).\n`;
    alertMarkdown += `2. **Move At-Risk Vaccines**: If the temperature remains above **${tempMax}°C** for more than 45 minutes, transfer the most heat-sensitive inventory to the backup cold box or a neighboring functional refrigerator.\n`;
    alertMarkdown += `3. **Inspect the Unit**: Verify that the refrigerator door is tightly closed. Check if the compressor is running and inspect the door gaskets for damage or leaks.\n`;
    alertMarkdown += `4. **VVM Verification**: Inspect the Vaccine Vial Monitors (VVM) on the vials. If the inner square has turned the same color or darker than the outer circle, discard those vials according to WHO disposal protocols.\n`;
  } else {
    alertMarkdown += `#### ❄️ Freezing Threat Analysis:\n`;
    alertMarkdown += `- **Freeze-Sensitive Vaccines at Risk**: `;
    const freezeSensitive = vaccines.filter(v => ['hepb', 'dtp', 'pentavalent', 'pcv', 'ipv', 'tt', 'hpv'].includes(v.type?.toLowerCase() || v.name?.toLowerCase()));
    if (freezeSensitive.length > 0) {
      alertMarkdown += freezeSensitive.map(v => `**${v.name}** (${v.quantity} doses)`).join(', ');
      alertMarkdown += `. **CRITICAL**: Freezing permanently destroys the potency of these adjuvant-based vaccines.\n`;
    } else {
      alertMarkdown += `Freeze-sensitive vaccines such as Hepatitis B, DTP, and Pentavalent.\n`;
    }

    alertMarkdown += `\n#### 📋 Actionable Steps:\n`;
    alertMarkdown += `1. **Move Vaccines Immediately**: Freezing temperatures represent an immediate threat to freeze-sensitive formulations. Relocate them to a section of the refrigerator that is warmer, or to a separate unit operating at 2-8°C.\n`;
    alertMarkdown += `2. **Conduct the Shake Test**: If you suspect any freeze-sensitive vials have frozen, perform the **WHO Shake Test** once the vial has thawed. Compare it to a control vial from the same batch that was intentionally frozen. If the suspect vial settles faster than the control, the vaccine has been damaged and must be discarded.\n`;
    alertMarkdown += `3. **Adjust Thermostat**: Slightly adjust the thermostat to a warmer setting and monitor the sensor readings closely.\n`;
    alertMarkdown += `4. **Sensor Positioning**: Ensure the IoT sensor probe is not resting against the cooling plate or evaporator coils, which can read falsely low temperatures.\n`;
  }

  return alertMarkdown;
}

// Smart local fallback for chat assistant
function getMockChatResponse(message: string): string {
  const cleanMsg = message.toLowerCase();

  if (cleanMsg.includes('temperature') || cleanMsg.includes('temp') || cleanMsg.includes('range') || cleanMsg.includes('excursion')) {
    return `**Vaccine Storage Temperature Standards:**\n\n1. **Refrigerated Vaccines (2°C to 8°C)**:
* Standard target is **5°C**.
* Includes BCG, Oral Polio Vaccine (OPV) (short-term), IPV, DTP-HepB-Hib (Pentavalent), PCV, Rotavirus, Measles-Rubella, HPV, and Tetanus.
* Never let these drop below 0°C or exceed 8°C.

2. **Freezer Vaccines (-25°C to -15°C)**:
* Standard target is **-20°C**.
* Primarily used for long-term storage of **OPV** (Oral Polio Vaccine) and some formulations of Measles/Varicella vaccines.

**What to do during a temperature excursion:**
* **Do not panic** but act swiftly.
* Keep the refrigerator door closed to maintain the cold climate as long as possible.
* Check the current temperature reading. If it's outside range, locate your backup cold box or vaccine carrier.
* Identify the sensitive vaccines. Move heat-sensitive vaccines first if too hot, or freeze-sensitive vaccines if freezing.
* Document the duration and temperatures reached in the excursion log.`;
  }

  if (cleanMsg.includes('freeze') || cleanMsg.includes('shake test') || cleanMsg.includes('freeze-sensitive')) {
    return `### The WHO Shake Test\n\nThe **Shake Test** is used to determine if freeze-sensitive vaccines (like Pentavalent, PCV, HepB, or Tetanus Toxoid) have been permanently damaged by freezing.\n\n**Step-by-step Protocol:**\n\n1. **Prepare a Control Vial**: Take a vial of the same vaccine from the same batch that you know has *never* been frozen, and intentionally freeze it solid at -10°C for 24 hours. Let it thaw completely. This is your "Frozen Control".\n2. **Select the Suspect Vial**: Take the vial you suspect was frozen during the excursion. This is your "Suspect Vial".\n3. **Shake Both Vials**: Shake both the Frozen Control and the Suspect Vial vigorously for 10-15 seconds.\n4. **Observe Sedimentation**: Place both vials side-by-side on a flat surface under good light and watch them settle:\n   * **If the Suspect Vial settles faster** than the Frozen Control, or if you see clear liquid at the top of the Suspect Vial much sooner, the Suspect Vial has been damaged by freezing and **MUST BE DISCARDED**.\n   * **If they settle at the same rate**, the Suspect Vial is safe to use.`;
  }

  if (cleanMsg.includes('polio') || cleanMsg.includes('opv') || cleanMsg.includes('measles')) {
    return `### Heat-Sensitive Vaccines: OPV & Measles\n\n**Oral Polio Vaccine (OPV)** and **Measles/Rubella** vaccines are highly sensitive to heat and light.\n\n* **OPV (Oral Polio)**: Extremely heat-sensitive. For long-term storage (e.g. at national/regional hubs), it should be kept in a freezer at **-25°C to -15°C**. For short-term storage (health center level), it can be stored in a standard refrigerator at **2°C to 8°C** for up to 6 months.\n* **Measles/Rubella**: Live vaccines that are sensitive to heat. Once reconstituted, they degrade extremely rapidly and **must be discarded within 6 hours** or at the end of the immunization session, whichever comes first.\n* **VVM**: Always check the Vaccine Vial Monitor (VVM) square before administering OPV or Measles vaccines.`;
  }

  if (cleanMsg.includes('power') || cleanMsg.includes('failure') || cleanMsg.includes('outage') || cleanMsg.includes('electricity')) {
    return `### Emergency Power Outage Checklist\n\nWhen a power failure occurs at a health facility:\n\n1. **Keep Refrigerator Closed**: A well-insulated vaccine refrigerator can maintain safe temperatures (2–8°C) for **up to 4–8 hours** if the door remains completely closed.\n2. **Activate Monitoring**: Ensure the IoT temperature sensors are still online (if they are battery-powered/have power bank backups) or log temperatures manually using dial thermometers.\n3. **Prepare Cold Boxes**: If the outage is expected to exceed 4 hours, prepare your vaccine carriers or cold boxes. Place conditioned coolant packs (or icepacks) inside the boxes.\n4. **Conditioning Coolant Packs**: If using frozen icepacks, keep them at room temperature until sweat/water drops form on the surface. Putting frozen icepacks directly next to freeze-sensitive vaccines will freeze and destroy them.\n5. **Relocate Vaccine Inventory**: Safely transfer the vaccines to the prepared cold boxes, placing a temperature indicator or thermometer inside.`;
  }

  if (cleanMsg.includes('defrost') || cleanMsg.includes('maintenance') || cleanMsg.includes('ice')) {
    return `### Defrosting and Cleaning a Vaccine Refrigerator\n\nThick ice build-up (greater than **5–10mm**) acts as an insulator, making the refrigerator work harder and causing temperature instability.\n\n**Defrosting Protocol:**\n\n1. **Relocate Vaccines**: Move all vaccines to a functional backup refrigerator or pre-prepared cold boxes with conditioned coolant packs.\n2. **Power Off**: Turn off the power supply and unplug the refrigerator. Leave the door open.\n3. **Let Ice Melt**: Do not use sharp objects, knives, or ice picks to scrape off the ice, as this can puncture the evaporator plates and ruin the coolant lines. Let it melt naturally, placing towels to catch the water.\n4. **Clean & Dry**: Wash the interior surfaces with mild soapy water. Wipe it dry completely to prevent quick re-icing.\n5. **Restart & Stabilize**: Close the door, plug the unit back in, and turn it on. \n6. **Return Vaccines**: Monitor the temperature until it stabilizes within the safe **2°C to 8°C** range (typically takes 2-4 hours). Only then return the vaccines to the refrigerator.`;
  }

  if (cleanMsg.includes('hi') || cleanMsg.includes('hello') || cleanMsg.includes('hey') || cleanMsg.includes('greetings')) {
    return `Hello! I am **Sentinel AI**, your Cold Chain Management assistant.\n\nI can help you with:\n- Vaccine storage temperature requirements (refrigerators & freezers)\n- Managing temperature excursions (too hot or too cold alerts)\n- Equipment maintenance (defrosting, cleaning, sensor alignment)\n- WHO/UNICEF clinical protocols (such as the **Shake Test** or **VVM guidelines**)\n\nWhat cold chain questions or storage issues can I assist you with today?`;
  }

  return `I am **Sentinel AI**, your dedicated Vaccine Cold Chain Assistant. I specialize in answering questions about vaccine storage safety, temperature logs, refrigerator troubleshooting, and WHO cold chain protocols.\n\nIt looks like your question is outside my primary scope. Could you please specify a question regarding vaccine handling, refrigerator maintenance, or cold chain management? For example:\n- *"How do I perform a shake test?"*\n- *"What are the storage guidelines for the polio vaccine?"*\n- *"What should I do if my freezer goes out of range?"*`;
}

// POST /api/ai/recommendation
// Generates clinical preservation guidance for a specific fridge
router.post('/recommendation', async (req: AuthRequest, res) => {
  const { fridgeId } = req.body;
  if (!fridgeId) {
    return res.status(400).json({ error: 'fridgeId is required' });
  }

  try {
    const hcFilter = getHCFilter(req);

    let fridge: any = null;
    let dev: any = null;
    let reading: any = null;
    let vaccines: any[] = [];
    let hcName = 'Unknown Health Center';

    if (!isConnected()) {
      fridge = memFridges.find(f => f.id === fridgeId);
      if (!fridge) {
        return res.status(404).json({ error: 'Fridge not found' });
      }
      if (hcFilter && fridge.healthCenterId !== hcFilter) {
        return res.status(403).json({ error: 'Access denied to this storage unit' });
      }

      dev = memDevices.find(d => d.fridgeId === fridgeId);
      reading = dev ? latestReadings.get(dev.id) : null;
      vaccines = memVaccines.filter(v => v.fridgeId === fridgeId);
      const hc = memHC.find(h => h.id === fridge.healthCenterId);
      hcName = hc?.name || 'Mock Health Center';
    } else {
      fridge = await FridgeModel.findById(fridgeId).lean();
      if (!fridge) {
        return res.status(404).json({ error: 'Fridge not found' });
      }
      if (hcFilter && String(fridge.healthCenterId) !== String(hcFilter)) {
        return res.status(403).json({ error: 'Access denied to this storage unit' });
      }

      const hc = await HealthCenterModel.findById(fridge.healthCenterId).lean();
      hcName = hc?.name || 'Unknown Health Center';

      dev = await DeviceModel.findOne({ fridgeId: fridge._id }).lean();
      if (dev) {
        reading = latestReadings.get(String(dev._id)) || null;
        if (!reading) {
          reading = await SensorReadingModel.findOne({ deviceId: dev._id }).sort({ timestamp: -1 }).lean();
        }
      }
      vaccines = await VaccineModel.find({ fridgeId: fridge._id }).lean();
    }

    const currentTemp = reading ? reading.temperature : null;
    const currentHumidity = reading ? reading.humidity : null;

    // Try to call Gemini API
    if (process.env.GEMINI_API_KEY) {
      try {
        const systemInstruction = `You are a clinical vaccine safety advisor and WHO cold chain specialist. 
Your role is to analyze a cold storage unit's current state, detect temperature excursions (out of target range), and provide step-by-step clinical preservation directives for the health center manager.
Be clear, practical, structured in markdown, and highly concise. Do not use code blocks around your response.`;

        const prompt = `A temperature monitoring incident occurred at ${hcName}.
Storage Unit Name: ${fridge.name}
Unit Type: ${fridge.type}
Target Temperature Range: ${fridge.targetTempMin}°C to ${fridge.targetTempMax}°C
Current Temperature Reading: ${currentTemp !== null ? currentTemp + '°C' : 'No active reading'}
Current Humidity: ${currentHumidity !== null ? currentHumidity + '%' : 'No active reading'}

Vaccines Stored:
${vaccines.map(v => `- ${v.name} (${v.quantity} doses, status: ${v.status}, expiry: ${v.expiryDate}, target temp: ${v.storageRequirements?.tempMin || 2}°C to ${v.storageRequirements?.tempMax || 8}°C)`).join('\n')}

Analyze this situation. If the temperature is within target, verify it is operating correctly and give standard maintenance tip. If the temperature is out of range, detail which vaccines are at risk, estimate the urgency, and list clear, numbered steps for:
1. Immediate physical troubleshooting (e.g. power checks, door check).
2. Preparation of vaccine carriers or backup cooling boxes, detailing specific instructions for coolant/icepacks.
3. Clinical evaluation protocols (VVM check, WHO Shake Test if freezing is suspected).
4. Reporting and escalation.
Keep the advice bulleted, professional, and actionable. Avoid introductory filler. Start directly with the analysis.`;

        const responseText = await callGemini([
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ], systemInstruction);

        return res.json({ recommendation: responseText });
      } catch (geminiError) {
        console.error('[Gemini API Error, falling back to local recommendation generator]:', geminiError);
        // Fallback to local generator
        const localRec = getMockRecommendation(fridge, currentTemp, currentHumidity, vaccines, hcName);
        return res.json({ recommendation: localRec });
      }
    } else {
      // No API key, fallback to local generator
      const localRec = getMockRecommendation(fridge, currentTemp, currentHumidity, vaccines, hcName);
      return res.json({ recommendation: localRec });
    }
  } catch (error) {
    console.error('[AI Recommendation Endpoint Error]:', error);
    res.status(500).json({ error: 'Internal server error while generating recommendation' });
  }
});

// POST /api/ai/chat
// Handles chat messages for Cold Chain Storage Practices
router.post('/chat', async (req: AuthRequest, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    if (process.env.GEMINI_API_KEY) {
      try {
        const systemInstruction = `You are "Sentinel AI", a professional, helpful, and knowledgeable AI assistant specializing in Vaccine Cold Chain Management, Storage Safety, Refrigerator Maintenance, and Equipment Troubleshooting for health center managers.
Provide accurate, clinical, and operational advice regarding vaccine temperatures, refrigerator maintenance, vaccine handling, WHO/UNICEF standards, and storage best practices.
Keep your responses concise, highly readable, structured with bullet points, and practical. Always prioritize clinical safety and vaccine potency.
Never answer general queries unrelated to cold chains, vaccines, refrigeration, medicine, or health center operations. If a user asks something out of scope, politely redirect them back to vaccine cold chain topics.`;

        // Format history for Gemini API
        const contents = (history || []).map((h: any) => ({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        }));

        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        const responseText = await callGemini(contents, systemInstruction);
        return res.json({ response: responseText });
      } catch (geminiError) {
        console.error('[Gemini Chat API Error, falling back to local chat assistant]:', geminiError);
        const localResponse = getMockChatResponse(message);
        return res.json({ response: localResponse });
      }
    } else {
      // No API key, fallback to local chat assistant
      const localResponse = getMockChatResponse(message);
      return res.json({ response: localResponse });
    }
  } catch (error) {
    console.error('[AI Chat Endpoint Error]:', error);
    res.status(500).json({ error: 'Internal server error while handling chat message' });
  }
});

export default router;
