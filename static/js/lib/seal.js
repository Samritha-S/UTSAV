/**
 * Utsav Planner - Traditional Geometric Kolam Seal Module
 *
 * Generates a deterministic, high-fidelity radial Kolam (Rangoli) emblem
 * using pure SVG DOM methods (createElementNS) with zero innerHTML.
 *
 * Features:
 * - 8-fold rotational symmetry with concentric lotus petals and interlaced loops.
 * - Central bindu dot, cardinal anchor points, and sacred geometric diamond frame.
 * - Single-pass drawing animation (~1.2s) that rests gracefully.
 * - Full respect for prefers-reduced-motion (instant static rendering).
 * - Scalable vector coordinates (500x500 viewBox).
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Helper to construct an SVG element with given attributes and children.
 * @param {string} tag
 * @param {Record<string, string|number>} [attrs]
 * @param {...(SVGElement|string)} children
 * @returns {SVGElement}
 */
function createSvgElement(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (val !== undefined && val !== null) {
      el.setAttribute(key, String(val));
    }
  }
  for (const child of children) {
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
}

/**
 * Generate geometric path points for 8-petaled radial Kolam symmetry.
 * @param {number} cx
 * @param {number} cy
 * @param {number} rInner
 * @param {number} rOuter
 * @param {number} count
 * @returns {string} SVG path d string
 */
export function generateRadialPetalsPath(cx, cy, rInner, rOuter, count = 8) {
  const points = [];
  const step = (Math.PI * 2) / count;
  const halfStep = step / 2;

  for (let i = 0; i < count; i++) {
    const angle = i * step;
    const midAngle = angle + halfStep;
    const nextAngle = angle + step;

    // Base point 1
    const x1 = cx + rInner * Math.cos(angle);
    const y1 = cy + rInner * Math.sin(angle);

    // Tip point
    const xTip = cx + rOuter * Math.cos(midAngle);
    const yTip = cy + rOuter * Math.sin(midAngle);

    // Base point 2
    const x2 = cx + rInner * Math.cos(nextAngle);
    const y2 = cy + rInner * Math.sin(nextAngle);

    // Control point for smooth petal curve
    const cRadius = rOuter * 0.9;
    const cp1x = cx + cRadius * Math.cos(angle + step * 0.25);
    const cp1y = cy + cRadius * Math.sin(angle + step * 0.25);
    const cp2x = cx + cRadius * Math.cos(nextAngle - step * 0.25);
    const cp2y = cy + cRadius * Math.sin(nextAngle - step * 0.25);

    if (i === 0) {
      points.push(`M ${x1.toFixed(2)} ${y1.toFixed(2)}`);
    }
    points.push(
      `Q ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${xTip.toFixed(2)} ${yTip.toFixed(2)}`
    );
    points.push(
      `Q ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`
    );
  }

  points.push("Z");
  return points.join(" ");
}

/**
 * Create a live, high-resolution Kolam Seal SVG element.
 * @param {Object} [options]
 * @param {number} [options.size=500] - Rendered width & height
 * @param {boolean} [options.animated=true] - Whether to apply stroke-drawing animation
 * @param {string} [options.className='hero-kolam-seal'] - CSS class name
 * @param {string} [options.ariaLabel] - Accessible label (if not decorative)
 * @returns {SVGSVGElement}
 */
export function createKolamSeal(options = {}) {
  const {
    size = 500,
    animated = true,
    className = "hero-kolam-seal",
    ariaLabel = null,
  } = options;

  const svg = createSvgElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 500 500",
    fill: "none",
    class: `${className} ${animated ? "kolam-animated" : ""}`.trim(),
    role: ariaLabel ? "img" : "presentation",
    "aria-hidden": ariaLabel ? "false" : "true",
  });

  if (ariaLabel) {
    const title = createSvgElement("title", {}, ariaLabel);
    svg.appendChild(title);
  }

  const cx = 250;
  const cy = 250;

  // 0. ClipPath Definition to Guarantee Circular Boundary
  const defs = createSvgElement("defs");
  const clipPath = createSvgElement("clipPath", { id: "kolam-seal-boundary" });
  clipPath.appendChild(
    createSvgElement("circle", {
      cx,
      cy,
      r: 236,
    })
  );
  defs.appendChild(clipPath);
  svg.appendChild(defs);

  // Group wrapped with clip-path so no stroke or corner can ever escape the boundary
  const boundedGroup = createSvgElement("g", {
    "clip-path": "url(#kolam-seal-boundary)",
  });

  // 1. Concentric Guide Circles
  boundedGroup.appendChild(
    createSvgElement("circle", {
      cx,
      cy,
      r: 236,
      class: "kolam-stroke-outer",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-dasharray": "6 4",
    })
  );

  boundedGroup.appendChild(
    createSvgElement("circle", {
      cx,
      cy,
      r: 218,
      class: "kolam-stroke-main",
      stroke: "currentColor",
      "stroke-width": "2",
    })
  );

  // 2. Interlaced Diamond / Square Frames (Constrained within r=218 circle)
  // Rotated 45-deg square: width 308 -> half-diag 154 * sqrt(2) = 217.79px <= 218px
  boundedGroup.appendChild(
    createSvgElement("rect", {
      x: 96,
      y: 96,
      width: 308,
      height: 308,
      transform: `rotate(45 ${cx} ${cy})`,
      class: "kolam-stroke-main",
      stroke: "currentColor",
      "stroke-width": "1.75",
    })
  );

  // Upright square: width 300 -> corner dist 150 * sqrt(2) = 212.13px <= 218px
  boundedGroup.appendChild(
    createSvgElement("rect", {
      x: 100,
      y: 100,
      width: 300,
      height: 300,
      class: "kolam-stroke-faint",
      stroke: "currentColor",
      "stroke-width": "1",
    })
  );

  // 3. Outer Radial Lotus Petals (8-fold symmetry)
  const outerPetalsPath = generateRadialPetalsPath(cx, cy, 140, 215, 8);
  boundedGroup.appendChild(
    createSvgElement("path", {
      d: outerPetalsPath,
      class: "kolam-stroke-main",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linejoin": "round",
    })
  );

  // 4. Middle Concentric Petals (Rotated 22.5 deg offset)
  const midPetalsPath = generateRadialPetalsPath(cx, cy, 90, 160, 8);
  const midPetalsGroup = createSvgElement("g", {
    transform: `rotate(22.5 ${cx} ${cy})`,
  });
  midPetalsGroup.appendChild(
    createSvgElement("path", {
      d: midPetalsPath,
      class: "kolam-stroke-accent",
      stroke: "currentColor",
      "stroke-width": "1.75",
      "stroke-linejoin": "round",
    })
  );
  boundedGroup.appendChild(midPetalsGroup);

  // 5. Inner Petal Ring
  const innerPetalsPath = generateRadialPetalsPath(cx, cy, 45, 95, 8);
  boundedGroup.appendChild(
    createSvgElement("path", {
      d: innerPetalsPath,
      class: "kolam-stroke-main",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linejoin": "round",
    })
  );

  // 6. Central Symmetrical Rings & Core Bindu
  boundedGroup.appendChild(
    createSvgElement("circle", {
      cx,
      cy,
      r: 45,
      class: "kolam-stroke-main",
      stroke: "currentColor",
      "stroke-width": "2",
    })
  );

  boundedGroup.appendChild(
    createSvgElement("circle", {
      cx,
      cy,
      r: 28,
      class: "kolam-stroke-accent",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-dasharray": "3 3",
    })
  );

  boundedGroup.appendChild(
    createSvgElement("circle", {
      cx,
      cy,
      r: 10,
      class: "kolam-fill-bindu",
      fill: "currentColor",
    })
  );

  // 7. Symmetrical Ray Lines and Cardinal Accent Bindus
  const raysGroup = createSvgElement("g", { class: "kolam-rays" });
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    const rStart = i % 2 === 0 ? 46 : 96;
    const rEnd = i % 2 === 0 ? 216 : 158;
    const xStart = cx + rStart * Math.cos(angle);
    const yStart = cy + rStart * Math.sin(angle);
    const xEnd = cx + rEnd * Math.cos(angle);
    const yEnd = cy + rEnd * Math.sin(angle);

    raysGroup.appendChild(
      createSvgElement("line", {
        x1: xStart.toFixed(2),
        y1: yStart.toFixed(2),
        x2: xEnd.toFixed(2),
        y2: yEnd.toFixed(2),
        class: i % 2 === 0 ? "kolam-stroke-faint" : "kolam-stroke-accent",
        stroke: "currentColor",
        "stroke-width": i % 2 === 0 ? "1" : "1.25",
      })
    );

    // Accent bindu dots at perimeter
    if (i % 2 === 0) {
      const dotX = cx + 228 * Math.cos(angle);
      const dotY = cy + 228 * Math.sin(angle);
      raysGroup.appendChild(
        createSvgElement("circle", {
          cx: dotX.toFixed(2),
          cy: dotY.toFixed(2),
          r: i % 4 === 0 ? 3.5 : 2.5,
          class: "kolam-fill-bindu",
          fill: "currentColor",
        })
      );
    }
  }
  boundedGroup.appendChild(raysGroup);
  svg.appendChild(boundedGroup);

  return svg;
}
