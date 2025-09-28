// src/simulation_rules.js

/**
 * Construye un Set con todos los identificadores válidos de elemento.
 * Incluye: id, type, label/name si existen (todo como strings).
 */
function buildElementsIdSet(elements = []) {
console.log(elements)
  const s = new Set();
  elements.forEach((el) => {
    if (el.type != null) s.add(String(el.type));
    
  });
  console.log("elementos",s)
  return s;
}

/**
 * Extrae referencias directas a elementos desde node.data
 * Heurística:
 *  - Revisa claves conocidas: 'elemento', 'element', 'element_id', 'elemento_id'
 *  - Escanea recursivamente node.data buscando strings/nums que coincidan con elementsSet (si se provee)
 */
function extractReferencedElementIds(node, elementsSet = null) {
  const found = new Set();
  console.log("node",node)
  if (!node || !node.params) return [];
    
  const data = node.params;

  // 1) claves frecuentes en tu app (incluye 'elemento' español)
  const keysToCheck = [
    "elemento",
    "element",
    "element_id",
    "elemento_id",
    "elementId",
    "selectedElement",
    "assignedElement",
    "elementoSeleccionado",
  ];

  for (const k of keysToCheck) {
    if (k in data && data[k] != null) {
      if (Array.isArray(data[k])) data[k].forEach((v) => found.add(String(v)));
      else found.add(String(data[k]));
    }
  }

  // 2) búsqueda recursiva por si la referencia está anidada (ej params.cc -> keys o values)
  function recurse(v) {
    if (v == null) return;
    if (Array.isArray(v)) return v.forEach(recurse);
    if (typeof v === "object") return Object.values(v).forEach(recurse);
    // valor primitivo
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).trim();
      if (s === "") return;
      // si hay elementsSet, solo añadir si coincide con un elemento conocido
      if (elementsSet) {
        if (elementsSet.has(s)) found.add(s);
      } else {
        found.add(s);
      }
    }
  }

  recurse(data);

  // Si elementsSet fue suministrado, devolvemos solo los que existen
  if (elementsSet) {
    return Array.from(found).filter((id) => elementsSet.has(id));
  }
  return Array.from(found);
}

/**
 * Validación A: cada nodo que POR DISEÑO requiere un elemento debe referenciar al menos uno.
 * Puedes personalizar allowedWithoutElement con tipos que NO necesitan elemento.
 */
function validateNodesHaveElements(nodes = [], elements = [], allowedWithoutElement = []) {
  const elemsSet = buildElementsIdSet(elements);
  const errors = [];

  nodes.forEach((n) => {
    // Si es transformer lo omitimos (lo dejamos pasar)
    if (String(n.type).toLowerCase() === "transformer") return;

    if (allowedWithoutElement.includes(String(n.type))) return; // omitir tipos permitidos

    const refs = extractReferencedElementIds(n, elemsSet);
    if (!refs || refs.length === 0) {
      errors.push({
        nodeId: n.id,
        type: n.type,
        message: `Nodo ${n.id} (tipo=${n.type}) no tiene asignado ningún elemento (buscar en node.params.elemento).`,
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateNodeElementsExist(nodes = [], elements = []) {
  const elemsSet = buildElementsIdSet(elements);
  const errors = [];

  nodes.forEach((n) => {
    // Si es transformer lo omitimos (no validamos existencia de elementos)
    if (String(n.type).toLowerCase() === "transformer") return;

    // extraemos referencias sin filtrar para detectar las que NO existen
    const refsRaw = extractReferencedElementIds(n, null);
    const missing = refsRaw.filter((r) => !elemsSet.has(String(r)));

    if (!elemsSet.has(n.params.elemento)) {
      errors.push({
        nodeId: n.id,
        type: n.type,
        message: `Nodo ${n.id} (tipo=${n.type}) referencia elemento(s) no existentes: ${missing.join(", ")}`,
        missing,
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validación general de processDef:
 * - nodes: [{id,type,data}]
 * - edges: [{from,to, ...}]
 * - elements: [{id,type,label,...}]
 *
 * Retorna { valid: boolean, errors: [...] }
 */
export function validateProcessDef(processDef = {}, opts = {}) {
  const nodes = processDef.nodes || [];
  const edges = processDef.edges || [];
  const elements = processDef.elements || [];

  const allowedWithoutElement = opts.allowedWithoutElement || []; // ej ['selector','output']

  const resultErrors = [];

  const v1 = validateNodesHaveElements(nodes, elements, allowedWithoutElement);
  if (!v1.valid) resultErrors.push(...v1.errors);

  const v2 = validateNodeElementsExist(nodes, elements);
  if (!v2.valid) resultErrors.push(...v2.errors);

  // Validación adicional: edges apuntan a nodos válidos
  const nodeIds = new Set(nodes.map((n) => String(n.id)));
  edges.forEach((e, idx) => {
    if (!nodeIds.has(String(e.from))) resultErrors.push({ message: `Edge[${idx}] source inválido: ${e.from}` });
    if (!nodeIds.has(String(e.to))) resultErrors.push({ message: `Edge[${idx}] target inválido: ${e.to}` });
  });

  return { valid: resultErrors.length === 0, errors: resultErrors };
}
