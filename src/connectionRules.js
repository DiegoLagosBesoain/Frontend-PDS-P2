// connectionRules.js

/**
 * Cada regla es una función que recibe sourceNode, targetNode y params.
 * Si la conexión es válida: retorna { valid: true }
 * Si es inválida: retorna { valid: false, message: "explicación del fallo" }
 */

// ---------- Helpers adicionales
function isGenOnDemand(node) {
  return node?.type === "generator" && Boolean(node.data?.onDemand);
}
function isGenNormal(node) {
  return node?.type === "generator" && !Boolean(node.data?.onDemand);
}

// 📌 Helpers para obtener elementos desde nodos (mantengo tus helpers)
function getSourceElemento(node, sourceHandle) {
  if (!node) return null;
  if (node.type === "transformer") {
    return sourceHandle || null;
  }
  return node.data?.elemento || null;
}

function getTargetElemento(node, targetHandle) {
  if (!node) return null;
  if (node.type === "transformer") {
    return targetHandle || null;
  }
  return node.data?.elemento || null;
}

// ---------- Reglas

// ⚡ Fila -> verificaciones de entrada y salida específicas
function ruleQueue(sourceNode, targetNode, params) {
  // Si la fila es la fuente (sourceNode.type === "queue"), sus salidas solo pueden ir a:
  // transformadores, transportadores y selectores
  if (sourceNode?.type === "queue") {
    const allowedTargets = new Set(["transformer", "transporter", "selector"]);
    if (!allowedTargets.has(targetNode?.type)) {
      return {
        valid: false,
        message: `Una fila solo puede conectarse a: ${[...allowedTargets].join(
          ", "
        )}. El destino es "${targetNode?.type}".`,
      };
    }
  }

  // Si la fila es el destino (targetNode.type === "queue"), sus entradas solo pueden venir de:
  // generadores normales (no onDemand), transportadores y transformadores
  if (targetNode?.type === "queue") {
    const sourceType = sourceNode?.type;
    if (
      !(
        sourceType === "transporter" ||
        sourceType === "transformer" ||
        isGenNormal(sourceNode)
      )
    ) {
      return {
        valid: false,
        message: `Una fila solo puede recibir conexiones de: generador (no onDemand), transporter, transformer. La fuente es "${sourceType}".`,
      };
    }
  }

  // Re-aplicar tus reglas previas específicas (no romper comportamiento anterior)
  if (sourceNode.type == "generator" && targetNode.type === "transformer" && !sourceNode.data.onDemand) {
    return {
      valid: false,
      message: `No se puede conectar un generador a un transformador a menos que sea onDemand`,
    };
  }
  if (sourceNode.type == "transporter" && targetNode.type === "transformer" && !sourceNode.data.onDemand) {
    return {
      valid: false,
      message: `Un transportador no puede conectarse directamente a un transformador (salida directa prohibida)`,
    };
  }
  if (sourceNode.type == "transformer" && targetNode.type === "transporter" && !sourceNode.data.onDemand) {
    return {
      valid: false,
      message: `Un transformador no puede conectarse directamente a un transportador`,
    };
  }
  if (sourceNode.type == "transformer" && targetNode.type === "transformer") {
    return {
      valid: false,
      message: `No se puede conectar un transformador a otro transformador`,
    };
  }

  // ❌ regla previa: fila no puede ir directo a salida (lo mantenemos)
  if (sourceNode.type === "queue" && targetNode.type === "output") {
    return {
      valid: false,
      message: `Una fila no puede conectarse directamente a una salida`,
    };
  }

  // comprobaciones de elemento (mantener comportamiento anterior)
  if (sourceNode.type === "queue") {
    const expected = sourceNode.data?.elemento;
    const targetElemento = getTargetElemento(targetNode, params.targetHandle);

    if (expected !== targetElemento) {
      return {
        valid: false,
        message: `La fila solo puede conectar con elementos de tipo "${expected}", pero el destino maneja "${targetElemento}"`,
      };
    }
  }

  if (targetNode.type === "queue") {
    const expected = targetNode.data?.elemento;
    const sourceElemento = getSourceElemento(sourceNode, params.sourceHandle);

    if (expected !== sourceElemento) {
      return {
        valid: false,
        message: `La fila solo puede recibir conexiones de tipo "${expected}", pero la fuente produce "${sourceElemento}"`,
      };
    }
  }

  return { valid: true };
}

// ⚡ Generador -> (mantengo tu parche anterior que valida onDemand y elemento)
function ruleGenerator(sourceNode, targetNode, params) {
  if (sourceNode?.type !== "generator") return { valid: true };

  const isOnDemand = Boolean(sourceNode.data?.onDemand);
  const targetType = targetNode?.type;

  const allowedWhenOnDemand = new Set(["selector", "transformer", "transporter"]);
  const allowedWhenNormal = new Set(["queue", "output"]);

  if (isOnDemand) {
    if (!allowedWhenOnDemand.has(targetType)) {
      return {
        valid: false,
        message: `Generador onDemand solo puede conectarse a: ${[...allowedWhenOnDemand].join(
          ", "
        )}. El destino es "${targetType}".`,
      };
    }
  } else {
    if (!allowedWhenNormal.has(targetType)) {
      return {
        valid: false,
        message: `Generador (no onDemand) solo puede conectarse a: ${[...allowedWhenNormal].join(
          ", "
        )}. El destino es "${targetType}".`,
      };
    }
  }

  const expected = sourceNode.data?.elemento ?? null;
  const targetElemento = getTargetElemento(targetNode, params.targetHandle);

  if (expected && expected !== targetElemento) {
    return {
      valid: false,
      message: `El generador produce "${expected}" pero el destino maneja "${targetElemento}"`,
    };
  }

  return { valid: true };
}

// ⚡ Transportador -> entradas y salidas según nueva spec
function ruleConveyor(sourceNode, targetNode, params) {
  // Si el transportador es destino -> entradas permitidas: filas, selectores, generadores onDemand
  if (targetNode?.type === "transporter") {
    const sourceType = sourceNode?.type;
    if (
      !(
        sourceType === "queue" ||
        sourceType === "selector" ||
        isGenOnDemand(sourceNode)
      )
    ) {
      return {
        valid: false,
        message: `Un transportador solo puede recibir conexiones de: queue, selector, generador onDemand. La fuente es "${sourceType}".`,
      };
    }
  }

  // Si el transportador es fuente -> salidas permitidas: output o queue (filas)
  if (sourceNode?.type === "transporter") {
    const allowedTargets = new Set(["output", "queue"]);
    if (!allowedTargets.has(targetNode?.type)) {
      return {
        valid: false,
        message: `Un transportador solo puede conectar hacia: ${[...allowedTargets].join(
          ", "
        )}. El destino es "${targetNode?.type}".`,
      };
    }

    // comprobar elemento como antes
    const expected = sourceNode.data?.elemento;
    const targetElemento = getTargetElemento(targetNode, params.targetHandle);
    if (expected !== targetElemento) {
      return {
        valid: false,
        message: `El transportador solo acepta conexiones de tipo "${expected}", pero el destino maneja "${targetElemento}"`,
      };
    }
  }

  // si el destino es transportador, también revisar match de elemento como antes (mantengo)
  if (targetNode.type === "transporter") {
    const expected = targetNode.data?.elemento;
    const sourceElemento = getSourceElemento(sourceNode, params.sourceHandle);

    if (expected !== sourceElemento) {
      return {
        valid: false,
        message: `El transportador solo acepta conexiones de tipo "${expected}", pero la fuente produce "${sourceElemento}"`,
      };
    }
  }

  return { valid: true };
}

// ⚡ Salida -> ahora outputs solo aceptan transformadores, transportadores o generadores normales
function ruleSink(sourceNode, targetNode, params) {
  if (targetNode.type === "output") {
    const sourceType = sourceNode?.type;

    // permitidos: transformer, transporter, generator (no onDemand)
    if (
      !(
        sourceType === "transformer" ||
        sourceType === "transporter" ||
        isGenNormal(sourceNode)
      )
    ) {
      return {
        valid: false,
        message: `Una salida solo puede recibir conexiones de: transformer, transporter o generator (no onDemand). La fuente es "${sourceType}".`,
      };
    }

    // luego verificar match de elemento (mantener comportamiento previo)
    const expected = targetNode.data?.elemento;
    const sourceElemento = getSourceElemento(sourceNode, params.sourceHandle);

    if (expected !== sourceElemento) {
      return {
        valid: false,
        message: `La salida solo puede recibir conexiones de tipo "${expected}", pero la fuente produce "${sourceElemento}"`,
      };
    }
  }
  return { valid: true };
}

// ⚡ Transformador -> entradas: filas, selectores, generadores onDemand
//                 salidas: output y filas
function ruleTransformer(sourceNode, targetNode, params) {
  // Caso: el transformador es el destino (targetNode.type === "transformer")
  if (targetNode?.type === "transformer") {
    const sourceType = sourceNode?.type;
    const allowedSources = new Set(["queue", "selector"]);
    // generadores permitidos solo si onDemand
    if (
      !(
        allowedSources.has(sourceType) ||
        isGenOnDemand(sourceNode)
      )
    ) {
      return {
        valid: false,
        message: `Un transformador solo puede recibir conexiones de: queue, selector, o generadores onDemand. La fuente es "${sourceType}".`,
      };
    }

    // además comprobación handle/elemento (mantengo la lógica previa para transformadores)
    const expected = targetNode.data?.handles?.[params.targetHandle];
    const sourceElemento = getSourceElemento(sourceNode, params.sourceHandle);

    if (expected && expected !== sourceElemento) {
      return {
        valid: false,
        message: `El transformador (${params.targetHandle}) espera "${expected}" y no puede conectarse con "${sourceElemento}"`,
      };
    }
  }

  // Caso: el transformador es la fuente (sourceNode.type === "transformer")
  if (sourceNode?.type === "transformer") {
    const allowedTargets = new Set(["output", "queue"]);
    if (!allowedTargets.has(targetNode?.type)) {
      return {
        valid: false,
        message: `Un transformador solo puede conectarse hacia: ${[...allowedTargets].join(
          ", "
        )}. El destino es "${targetNode?.type}".`,
      };
    }

    // comprobación de handle/producción hacia el target (mantengo tu lógica previa)
    const expected = sourceNode.data?.handles?.[params.sourceHandle];
    const targetElemento = getTargetElemento(targetNode, params.targetHandle);

    if (expected && expected !== targetElemento) {
      return {
        valid: false,
        message: `El transformador (${params.sourceHandle}) produce "${expected}" y no puede conectarse con "${targetElemento}"`,
      };
    }
  }

  return { valid: true };
}

// ⚡ Selector -> entradas permitidas: queue, selector, generador onDemand
//               salidas permitidas: transformer, transporter
function ruleSelector(sourceNode, targetNode, params) {
  // Si el selector es destino -> revisar entrada
  if (targetNode?.type === "selector") {
    const sourceType = sourceNode?.type;
    if (
      !(
        sourceType === "queue" ||
        sourceType === "selector" ||
        isGenOnDemand(sourceNode)
      )
    ) {
      return {
        valid: false,
        message: `Un selector solo puede recibir conexiones de: queue, selector, o generadores onDemand. La fuente es "${sourceType}".`,
      };
    }
  }

  // Si el selector es fuente -> revisar salida
  if (sourceNode?.type === "selector") {
    const allowedTargets = new Set(["transformer", "transporter"]);
    if (!allowedTargets.has(targetNode?.type)) {
      return {
        valid: false,
        message: `Un selector solo puede conectarse hacia: ${[...allowedTargets].join(
          ", "
        )}. El destino es "${targetNode?.type}".`,
      };
    }
  }

  return { valid: true };
}

// 📌 Conjunto de reglas (actualizado para incluir ruleSelector)
const rules = [
  ruleQueue,
  ruleGenerator,
  ruleConveyor,
  ruleSelector,   // nuevo
  ruleSink,
  ruleTransformer,
];

/**
 * Ejecuta todas las reglas y devuelve el primer fallo o {valid: true}
 */
export function validateConnection(sourceNode, targetNode, params) {
  for (const rule of rules) {
    const result = rule(sourceNode, targetNode, params);
    if (!result.valid) return result; // detener en el primer error
  }
  return { valid: true };
}
