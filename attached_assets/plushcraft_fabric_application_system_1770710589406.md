# PlushCraft 3D - Fabric Application System
## Complete Prompt for Applying Fabric Library to Projects

---

## MASTER FABRIC APPLICATION PROMPT

Use this prompt when applying a fabric from the library to a plush project:

```
You are generating a photorealistic 3D render of a plush toy with a SPECIFIC FABRIC applied.

You have TWO inputs:
1. The character specification/brief (showing the shape, proportions, features, and colors)
2. A fabric sample photo from our manufacturing library (showing the EXACT texture to apply)

YOUR TASK:
Generate a photorealistic 3D plush toy that:
- Matches the CHARACTER SHAPE exactly from the specification
- Applies the EXACT FABRIC TEXTURE from the fabric sample photo
- Combines them seamlessly as a real manufactured plush would look

=== CHARACTER FROM SPECIFICATION ===

Analyze the specification and preserve EXACTLY:
- Overall silhouette and proportions
- Head shape and size relative to body
- Ear size, shape, and position
- Eye shape, size, and position (solid matte, no reflections unless specified)
- Nose style (3D blob, embroidered, etc.)
- Mouth presence (if none shown, NO mouth)
- Body shape (round, oval, etc.)
- Arm position (if down, keep DOWN)
- Leg position and style
- Tail (if none shown, NO tail)
- All color placements (where each color goes)

=== FABRIC FROM LIBRARY SAMPLE ===

Look at the fabric sample photo and apply THIS EXACT TEXTURE:
- Match the pile length visible in the sample
- Match the fiber direction and density
- Match the surface sheen (matte, low-sheen, sparkle, etc.)
- Match how the fibers lay and flow
- Match the softness/fluffiness level

The fabric sample shows how the REAL fabric looks - your generated plush should look like it's made from THIS EXACT MATERIAL.

=== COLOR APPLICATION MODE ===

{{#if applyFabricColor}}
COLOR MODE: APPLY FABRIC COLOR
- Use the color from the fabric sample photo
- Replace the specification colors with the fabric sample color
- The entire plush (or selected areas) should be this fabric's color
{{else}}
COLOR MODE: KEEP SPECIFICATION COLORS  
- Keep the original colors from the character specification
- Apply ONLY the texture characteristics from the fabric
- The fabric texture wraps the original colors
{{/if}}

=== TEXTURE APPLICATION DETAILS ===

From the fabric sample, apply these characteristics:

PILE:
- Length: {fabric.pileCharacteristics.length_mm}mm
- Category: {fabric.pileCharacteristics.lengthCategory}
- Density: {fabric.pileCharacteristics.density}
- Direction: {fabric.pileCharacteristics.direction}
- Fiber type: {fabric.pileCharacteristics.fiberType}

SURFACE:
- Appearance: {fabric.textureDescription.visualAppearance}
- Pattern: {fabric.textureDescription.surfacePattern}
- Sheen level: {fabric.textureDescription.sheen}
- Tactile quality: {fabric.textureDescription.tactileWords.join(', ')}

TEXTURE PROMPT:
{fabric.promptComponents.texturePrompt}

=== CRITICAL ACCURACY RULES ===

1. TEXTURE ACCURACY:
   - The generated fabric MUST look like the sample photo
   - If sample shows 6mm dense straight fibers → generate 6mm dense straight fibers
   - If sample shows curly loops → generate curly loops
   - If sample shows crystal sparkle → generate crystal sparkle
   - Do NOT default to generic "plush texture"

2. CHARACTER ACCURACY:
   - Do NOT change the character's shape or proportions
   - Do NOT add features not in the specification
   - Do NOT remove features that ARE in the specification
   - Eyes, nose, mouth, ears must match the spec exactly

3. COMBINATION:
   - The fabric wraps the character form seamlessly
   - Seams should be subtle and realistic
   - The texture follows the 3D contours naturally
   - Areas like ears, belly, paws may have different fabric (if specified)

=== OUTPUT REQUIREMENTS ===

Generate:
- Single photorealistic product photograph
- Front-facing view
- White seamless studio background
- Soft diffused lighting
- The plush should look like a real manufactured product
- Fabric texture clearly visible and matching the sample

=== DO NOT GENERATE ===

- Specification sheets or diagrams
- Multiple views in one image
- 2D illustrations or cartoons
- Text, labels, or annotations
- Generic "teddy bear" texture if a specific fabric is provided
- Features not in the original specification

--no {fabric.promptComponents.negativePrompt}, specification sheet, diagram, 2D, flat, illustration, cartoon, generic plush texture, wrong pile length, wrong fiber type
```

---

## MULTI-AREA FABRIC APPLICATION PROMPT

When applying different fabrics to different parts of the plush:

```
You are generating a photorealistic 3D plush toy with MULTIPLE FABRICS applied to different areas.

=== CHARACTER SPECIFICATION ===
[Character details from brief analysis]

=== FABRIC ASSIGNMENTS ===

{{#each fabricAssignments}}
AREA: {{this.area}}
FABRIC: {{this.fabric.name}} ({{this.fabric.manufacturerCode}})
TEXTURE: {{this.fabric.promptComponents.texturePrompt}}
COLOR MODE: {{#if this.applyColor}}Use fabric color ({{this.fabric.colorAnalysis.primaryColor.name}}){{else}}Keep spec color{{/if}}
PILE: {{this.fabric.pileCharacteristics.length_mm}}mm, {{this.fabric.pileCharacteristics.density}}, {{this.fabric.pileCharacteristics.fiberType}}

{{/each}}

=== EXAMPLE ASSIGNMENTS ===

MAIN BODY:
- Fabric: BQC Bunny Fur 6mm
- Texture: soft dense bunny fur, 6mm pile, fine uniform straight fibers, matte finish
- Color: Keep specification blue

BELLY PATCH:
- Fabric: BQC Soft Boa Crystal 1.5mm
- Texture: short crystal boa, 1.5mm pile, smooth with sparkle sheen
- Color: Keep specification light blue

INNER EARS:
- Fabric: BQC Spandex 1mm
- Texture: smooth spandex-velvet, 1mm ultra-short pile, sleek soft surface
- Color: Keep specification purple

=== TRANSITION RULES ===

Where different fabrics meet:
- Seams should be subtle and realistic
- Transition should look like sewn pieces
- Each area's texture remains distinct
- No blending of textures at boundaries

=== OUTPUT ===

Single photorealistic product photo showing the plush with all fabrics applied to their designated areas, clearly visible and distinct.
```

---

## APPLY CHANGES BUTTON - SYSTEM LOGIC

```javascript
// ============================================================================
// APPLY CHANGES HANDLER
// ============================================================================

/**
 * Handles the "Apply Changes" button click
 * Takes current customization state and regenerates the plush
 */
async function handleApplyChanges(projectState) {
  const {
    briefAnalysis,           // Original character analysis from spec
    fabricAssignments,       // { area: 'body', fabricId: 'bqc-bunny-fur-6mm', applyColor: false }
    customizations,          // Any manual overrides
    generationSettings       // Model settings
  } = projectState;

  // Build the complete prompt
  const prompt = buildFabricApplicationPrompt({
    briefAnalysis,
    fabricAssignments,
    customizations
  });

  // Collect all images needed
  const images = [];
  
  // Add the original brief/spec
  images.push({
    type: 'brief',
    data: projectState.briefImageBase64,
    label: 'Character Specification'
  });

  // Add fabric sample photos for reference
  for (const assignment of fabricAssignments) {
    const fabric = getFabric(assignment.fabricId);
    if (fabric && fabric.images.primary) {
      images.push({
        type: 'fabric',
        data: await loadFabricImage(fabric.images.primary),
        label: `Fabric: ${fabric.name} for ${assignment.area}`
      });
    }
  }

  // Generate with all images + prompt
  const result = await generateWithFabrics(prompt, images, generationSettings);

  return result;
}

/**
 * Builds the complete prompt for fabric application
 */
function buildFabricApplicationPrompt({ briefAnalysis, fabricAssignments, customizations }) {
  let prompt = `You are generating a photorealistic 3D plush toy.

=== CHARACTER DETAILS ===
${formatCharacterDetails(briefAnalysis)}

=== FABRIC APPLICATIONS ===
`;

  // Add each fabric assignment
  for (const assignment of fabricAssignments) {
    const fabric = getFabric(assignment.fabricId);
    if (!fabric) continue;

    prompt += `
--- ${assignment.area.toUpperCase()} ---
Fabric: ${fabric.name}
`;

    // Texture (always applied)
    prompt += `
TEXTURE TO APPLY:
${fabric.promptComponents.texturePrompt}
- Pile: ${fabric.pileCharacteristics.length_mm}mm
- Density: ${fabric.pileCharacteristics.density}
- Fiber: ${fabric.pileCharacteristics.fiberType}
- Surface: ${fabric.textureDescription.visualAppearance}
- Sheen: ${fabric.textureDescription.sheen}
`;

    // Color (conditional)
    if (assignment.applyColor) {
      prompt += `
COLOR TO APPLY:
${fabric.promptComponents.colorPrompt}
Primary: ${fabric.colorAnalysis.primaryColor.name} (${fabric.colorAnalysis.primaryColor.hex})
`;
    } else {
      prompt += `
COLOR: Keep original specification color for this area
`;
    }
  }

  // Add any manual customizations
  if (customizations && Object.keys(customizations).length > 0) {
    prompt += `
=== ADDITIONAL CUSTOMIZATIONS ===
${formatCustomizations(customizations)}
`;
  }

  // Output requirements
  prompt += `
=== OUTPUT REQUIREMENTS ===
- Photorealistic 3D plush toy product photo
- Front-facing view on white background
- All specified fabrics clearly visible and accurate
- Character shape and features exactly matching specification
- Studio lighting, professional product photography style

=== DO NOT ===
- Change character proportions or features
- Use generic plush texture instead of specified fabrics
- Add features not in specification
- Generate diagrams, multiple views, or text
`;

  // Build negative prompt
  const negatives = fabricAssignments
    .map(a => getFabric(a.fabricId)?.promptComponents.negativePrompt)
    .filter(Boolean)
    .join(', ');

  prompt += `
--no ${negatives}, generic texture, specification sheet, 2D, flat, cartoon
`;

  return prompt;
}

/**
 * Format character details for prompt
 */
function formatCharacterDetails(analysis) {
  return `
Character: ${analysis.characterDescription?.overall || 'Plush toy character'}
Proportions: Head ${analysis.head?.proportion || 'standard'} of total height

HEAD: ${analysis.head?.shape || 'Round'}
EARS: ${analysis.ears?.count || 2} ${analysis.ears?.size || 'medium'} ${analysis.ears?.shape || 'rounded'} ears at ${analysis.ears?.position || 'sides of head'}

FACE:
- Eyes: ${analysis.eyes?.shape || 'oval'}, ${analysis.eyes?.color || 'dark'}
  ${analysis.eyes?.hasReflections ? 'With highlights' : 'Solid matte - NO reflections, NO highlights, NO shine'}
- Nose: ${analysis.nose?.present ? analysis.nose?.style : 'None'}
- Mouth: ${analysis.mouth?.present ? analysis.mouth?.style : 'NO mouth - smooth face'}

BODY: ${analysis.body?.shape || 'Round'}, ${analysis.body?.mainColor || 'as specified'}
${analysis.body?.bellyPatch?.present ? `Belly: ${analysis.body.bellyPatch.color}, ${analysis.body.bellyPatch.hasMarkings ? 'with markings' : 'plain solid - NO spots'}` : ''}

ARMS: ${analysis.arms?.style || 'Short stubby'}, position: ${analysis.arms?.position || 'down at sides'}
${analysis.arms?.isRaised === false ? '⚠️ Arms DOWN - do NOT raise' : ''}

LEGS: ${analysis.legs?.style || 'Short'}, ${analysis.legs?.position || 'forward sitting'}

TAIL: ${analysis.tail?.present ? analysis.tail?.description : 'NO tail'}
`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  handleApplyChanges,
  buildFabricApplicationPrompt,
  formatCharacterDetails
};
```

---

## UI COMPONENT - CUSTOMIZATION BOX WITH APPLY BUTTON

```jsx
// CustomizationPanel.jsx

import React, { useState } from 'react';
import { FABRIC_PROFILES, FABRIC_CATEGORIES, getFabric } from './fabric-library';

function CustomizationPanel({ 
  projectState, 
  onApplyChanges, 
  isGenerating 
}) {
  // Fabric assignments per area
  const [fabricAssignments, setFabricAssignments] = useState([
    { area: 'body', fabricId: null, applyColor: false },
    { area: 'belly', fabricId: null, applyColor: false },
    { area: 'ears-inner', fabricId: null, applyColor: false },
    { area: 'ears-outer', fabricId: null, applyColor: false },
    { area: 'paws', fabricId: null, applyColor: false },
    { area: 'muzzle', fabricId: null, applyColor: false },
  ]);

  const [activeArea, setActiveArea] = useState('body');
  const [hasChanges, setHasChanges] = useState(false);

  // Handle fabric selection for an area
  const handleFabricSelect = (fabricId) => {
    setFabricAssignments(prev => prev.map(a => 
      a.area === activeArea 
        ? { ...a, fabricId } 
        : a
    ));
    setHasChanges(true);
  };

  // Handle color toggle
  const handleColorToggle = (area, applyColor) => {
    setFabricAssignments(prev => prev.map(a => 
      a.area === area 
        ? { ...a, applyColor } 
        : a
    ));
    setHasChanges(true);
  };

  // Handle Apply Changes click
  const handleApply = async () => {
    const activeAssignments = fabricAssignments.filter(a => a.fabricId);
    
    await onApplyChanges({
      ...projectState,
      fabricAssignments: activeAssignments
    });
    
    setHasChanges(false);
  };

  return (
    <div className="customization-panel">
      <h2>🧵 Fabric Customization</h2>

      {/* Area Selection */}
      <div className="area-tabs">
        {fabricAssignments.map(assignment => (
          <button
            key={assignment.area}
            className={`area-tab ${activeArea === assignment.area ? 'active' : ''} ${assignment.fabricId ? 'has-fabric' : ''}`}
            onClick={() => setActiveArea(assignment.area)}
          >
            {assignment.area.replace('-', ' ')}
            {assignment.fabricId && <span className="dot">●</span>}
          </button>
        ))}
      </div>

      {/* Fabric Library Browser */}
      <div className="fabric-browser">
        <h3>Select Fabric for: {activeArea}</h3>
        
        {Object.entries(FABRIC_CATEGORIES).map(([catKey, category]) => (
          <div key={catKey} className="fabric-category">
            <h4>{category.icon} {category.name}</h4>
            <div className="fabric-grid">
              {category.fabrics.map(fabricId => {
                const fabric = FABRIC_PROFILES[fabricId];
                const isSelected = fabricAssignments.find(a => a.area === activeArea)?.fabricId === fabricId;
                
                return (
                  <div
                    key={fabricId}
                    className={`fabric-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleFabricSelect(fabricId)}
                  >
                    {/* ACTUAL fabric photo, not generated */}
                    <img 
                      src={`/fabrics/${fabric.images.primary}`} 
                      alt={fabric.name}
                    />
                    <div className="fabric-info">
                      <span className="name">{fabric.name}</span>
                      <span className="pile">{fabric.pileCharacteristics.length_mm}mm</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Fabric Details */}
      {fabricAssignments.find(a => a.area === activeArea)?.fabricId && (
        <div className="selected-fabric-details">
          {(() => {
            const assignment = fabricAssignments.find(a => a.area === activeArea);
            const fabric = getFabric(assignment.fabricId);
            
            return (
              <>
                <h3>Selected: {fabric.name}</h3>
                
                <div className="fabric-preview">
                  <img src={`/fabrics/${fabric.images.primary}`} alt={fabric.name} />
                  
                  <div className="fabric-specs">
                    <p><strong>Pile:</strong> {fabric.pileCharacteristics.length_mm}mm, {fabric.pileCharacteristics.density}</p>
                    <p><strong>Fiber:</strong> {fabric.pileCharacteristics.fiberType}</p>
                    <p><strong>Sheen:</strong> {fabric.textureDescription.sheen}</p>
                    <p><strong>Feel:</strong> {fabric.textureDescription.tactileWords.join(', ')}</p>
                  </div>
                </div>

                {/* Color Application Toggle */}
                <div className="color-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={assignment.applyColor}
                      onChange={(e) => handleColorToggle(activeArea, e.target.checked)}
                    />
                    <span>Apply fabric color</span>
                    <small>
                      {assignment.applyColor 
                        ? `Will use ${fabric.colorAnalysis.primaryColor.name}` 
                        : 'Will keep original spec color'}
                    </small>
                  </label>
                  
                  {assignment.applyColor && (
                    <div 
                      className="color-preview"
                      style={{ backgroundColor: fabric.colorAnalysis.primaryColor.hex }}
                    >
                      {fabric.colorAnalysis.primaryColor.name}
                    </div>
                  )}
                </div>

                {/* Remove fabric button */}
                <button 
                  className="remove-fabric"
                  onClick={() => handleFabricSelect(null)}
                >
                  Remove fabric from {activeArea}
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Summary of all assignments */}
      <div className="assignments-summary">
        <h3>Current Fabric Assignments</h3>
        {fabricAssignments.filter(a => a.fabricId).length === 0 ? (
          <p className="no-fabrics">No fabrics assigned yet</p>
        ) : (
          <ul>
            {fabricAssignments.filter(a => a.fabricId).map(a => {
              const fabric = getFabric(a.fabricId);
              return (
                <li key={a.area}>
                  <strong>{a.area}:</strong> {fabric.name}
                  {a.applyColor && ` (+ color: ${fabric.colorAnalysis.primaryColor.name})`}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* APPLY CHANGES BUTTON */}
      <div className="apply-section">
        <button
          className={`apply-button ${hasChanges ? 'has-changes' : ''}`}
          onClick={handleApply}
          disabled={isGenerating || !hasChanges}
        >
          {isGenerating ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            <>
              ✨ Apply Changes
              {hasChanges && <span className="badge">!</span>}
            </>
          )}
        </button>
        
        {hasChanges && (
          <p className="changes-hint">You have unsaved changes</p>
        )}
      </div>
    </div>
  );
}

export default CustomizationPanel;
```

---

## CSS FOR CUSTOMIZATION PANEL

```css
.customization-panel {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
  color: white;
}

.area-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.area-tab {
  padding: 8px 16px;
  border: 1px solid #333;
  border-radius: 20px;
  background: transparent;
  color: #888;
  cursor: pointer;
  position: relative;
}

.area-tab.active {
  background: #4a90a4;
  color: white;
  border-color: #4a90a4;
}

.area-tab.has-fabric {
  border-color: #4caf50;
}

.area-tab .dot {
  color: #4caf50;
  margin-left: 4px;
}

.fabric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin: 12px 0;
}

.fabric-card {
  border: 2px solid #333;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.fabric-card:hover {
  border-color: #666;
  transform: scale(1.02);
}

.fabric-card.selected {
  border-color: #4a90a4;
  box-shadow: 0 0 10px rgba(74, 144, 164, 0.5);
}

.fabric-card img {
  width: 100%;
  height: 80px;
  object-fit: cover;
}

.fabric-info {
  padding: 8px;
  background: #252540;
}

.fabric-info .name {
  display: block;
  font-size: 12px;
  font-weight: 500;
}

.fabric-info .pile {
  font-size: 10px;
  color: #888;
}

.color-toggle {
  margin: 16px 0;
  padding: 12px;
  background: #252540;
  border-radius: 8px;
}

.color-toggle label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.color-toggle small {
  display: block;
  color: #888;
  margin-left: 24px;
}

.color-preview {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  text-align: center;
  font-size: 12px;
}

.apply-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.apply-button {
  width: 100%;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #4a90a4, #357abd);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.apply-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 144, 164, 0.4);
}

.apply-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.apply-button.has-changes {
  animation: pulse 2s infinite;
}

.apply-button .badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4444;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 14px;
}

.apply-button .spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 144, 164, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(74, 144, 164, 0); }
}

.changes-hint {
  text-align: center;
  color: #ffa500;
  font-size: 12px;
  margin-top: 8px;
}
```

---

## GENERATION API CALL WITH FABRICS

```javascript
/**
 * Generate plush with fabric samples as reference images
 */
async function generateWithFabrics(prompt, images, settings = {}) {
  // For Google Gemini / Nano Banana Pro
  const contents = [{
    parts: []
  }];

  // Add all images (brief + fabric samples)
  for (const img of images) {
    contents[0].parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.data
      }
    });
    // Add label for context
    contents[0].parts.push({
      text: `[${img.label}]`
    });
  }

  // Add the main prompt
  contents[0].parts.push({
    text: prompt
  });

  // Call Gemini API
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents,
    generationConfig: {
      responseModalities: ["image", "text"]
    }
  });

  return response;
}
```

---

## SUMMARY

This system provides:

1. **Area-based fabric assignment** - Apply different fabrics to body, belly, ears, paws, etc.

2. **Texture vs Color toggle** - Apply just texture (keep spec colors) or both texture + color

3. **Real fabric photos** - UI shows actual fabric samples, not generated images

4. **Apply Changes button** - Only active when changes are made, triggers regeneration

5. **Complete prompt building** - Combines character spec + fabric details into one generation prompt

6. **Multi-image input** - Sends both the spec AND fabric sample photos to the AI for accurate matching

The key is that the AI sees BOTH the character spec AND the actual fabric photo, so it can match the texture exactly rather than guessing.
