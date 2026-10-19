import React, { useState, useEffect } from 'react';
import { api } from '../api';

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '-';
  const partes = String(fechaStr).split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaStr;
};

export default function ContratoImpreso({ contrato }) {
  const [firmaUrl, setFirmaUrl] = useState(null);

  useEffect(() => {
    let activo = true;
    let urlGenerada = null;

    const cargarFirma = async () => {
      if (contrato?.tieneFirmaGerente) {
        try {
          const blob = await api.contrato.firmaGerenteBlob();
          if (blob && activo) {
            urlGenerada = URL.createObjectURL(blob);
            setFirmaUrl(urlGenerada);
          }
        } catch {
          // Si no está disponible o falla, permanece nulo
        }
      }
    };

    cargarFirma();

    return () => {
      activo = false;
      if (urlGenerada) {
        URL.revokeObjectURL(urlGenerada);
      }
    };
  }, [contrato?.tieneFirmaGerente]);

  if (!contrato) return null;

  const cuotasLista = contrato.cuotas || [];
  const totalIntereses = cuotasLista.reduce((acc, c) => acc + (Number(c.interes) || 0), 0);
  const totalPagar = cuotasLista.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
  const totalCapital = Number(contrato.capital || 0);

  const dniDoc = String(contrato.clienteDni || '').trim();
  const esRuc20 = dniDoc.length === 11 && dniDoc.startsWith('20');
  const esRuc10 = dniDoc.length === 11 && dniDoc.startsWith('10');
  const esJuridica = esRuc20;

  const emisorRazonSocial = contrato.emisorRazonSocial || 'PRESTAMOS CASTILLO';
  const ciudad = contrato.ciudadContrato || contrato.sucursalNombre || 'Trujillo';
  const fechaEmision = contrato.fechaEmisionFormateada || contrato.fechaPrestamo;

  // Formatear TEA dinámica desde el contrato
  const teaPorcentaje = contrato.tea != null
    ? `${(Number(contrato.tea) < 1 ? Number(contrato.tea) * 100 : Number(contrato.tea)).toFixed(2)} %`
    : '30.00 %';

  const temPorcentaje = contrato.temPorcentajeCuatroDecimales != null
    ? `${contrato.temPorcentajeCuatroDecimales} %`
    : (contrato.tem != null ? `${(Number(contrato.tem) * 100).toFixed(4)} %` : '-');

  // Separar los párrafos del texto del contrato
  const parrafos = contrato.textoContrato
    ? contrato.textoContrato.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    : [];

  return (
    <div
      id="contrato-imprimible"
      className="printable-contract bg-white rounded-xl border border-[#E3D3C2] p-8 sm:p-12 shadow-2xs text-[#2A2220] font-sans text-xs leading-relaxed"
    >
      {/* ── CUERPO DEL CONTRATO LEGAL ── */}
      <div className="contrato-cuerpo space-y-3">
        {parrafos.map((p, idx) => {
          const texto = p.trim();
          const esTituloPrincipal = texto.startsWith('CONTRATO DE MUTUO DINERARIO');
          const esClausula = /^CLÁUSULA\s+[A-ZÁÉÍÓÚÑ\s]+.-/i.test(texto);

          if (esTituloPrincipal) {
            return (
              <div key={idx} className="text-center pb-4 border-b-2 border-[#2A2220] mb-5">
                <h1 className="text-lg sm:text-xl font-serif font-bold tracking-wide uppercase">
                  {texto}
                </h1>
                <div className="mt-2 flex flex-wrap justify-between items-center text-[11px] font-mono border-t border-gray-200 pt-2 text-gray-700">
                  <div><strong>N.º de contrato:</strong> {contrato.numeroContrato}</div>
                  <div><strong>Emisor:</strong> {emisorRazonSocial}</div>
                  <div><strong>Lugar y fecha:</strong> {ciudad}, {fechaEmision}</div>
                </div>
              </div>
            );
          }

          if (esClausula) {
            const indexPunto = texto.indexOf('.-');
            const tituloClausula = indexPunto !== -1 ? texto.substring(0, indexPunto + 2) : texto;
            const cuerpoClausula = indexPunto !== -1 ? texto.substring(indexPunto + 2).trim() : '';

            return (
              <div key={idx} className="mt-3">
                <h2 className="font-bold uppercase tracking-wide text-[11px] text-[#9C4A2B] mb-0.5">
                  {tituloClausula}
                </h2>
                {cuerpoClausula && (
                  <p className="text-justify leading-relaxed whitespace-pre-wrap">
                    {cuerpoClausula}
                  </p>
                )}
              </div>
            );
          }

          return (
            <p key={idx} className="text-justify leading-relaxed whitespace-pre-wrap">
              {texto}
            </p>
          );
        })}
      </div>

      {/* ── BLOQUE DE FIRMAS ── */}
      <div className="contrato-firmas mt-8 pt-6 border-t border-gray-300 avoid-break-inside">
        <div className="text-end font-medium text-xs mb-8 text-gray-700">
          {ciudad}, {fechaEmision}
        </div>

        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          {/* Firma Emisor EFS */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/40 flex flex-col justify-end">
            <div className="h-20 flex items-center justify-center mb-2">
              {firmaUrl ? (
                <img
                  src={firmaUrl}
                  alt="Firma del Gerente General"
                  className="max-h-20 max-w-[200px] object-contain"
                />
              ) : (
                <div className="text-[10px] text-gray-400 italic">
                  [ Sello y Firma Digital del Emisor ]
                </div>
              )}
            </div>
            <div className="border-t border-gray-800 mx-4 pt-2">
              <div className="font-bold text-xs uppercase tracking-wide text-[#2A2220]">
                {emisorRazonSocial}
              </div>
              <div className="text-[11px] text-gray-600 mt-0.5">
                Gerente General
              </div>
              <div className="text-[10px] text-gray-500 uppercase mt-0.5">
                EFS - El Prestamista
              </div>
            </div>
          </div>

          {/* Firma Cliente / Prestatario */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/40 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] uppercase font-bold text-gray-500">
                EL CLIENTE
              </span>
              <div className="w-16 h-20 border border-dashed border-gray-400 rounded flex flex-col items-center justify-center text-[9px] text-gray-400">
                <span>Huella</span>
                <span>Dactilar</span>
              </div>
            </div>

            <div className="border-t border-gray-800 mx-2 pt-2 text-start">
              <div className="font-bold text-xs text-[#2A2220]">
                {esRuc20
                  ? (contrato.empresaRazonSocial || contrato.clienteNombre)
                  : contrato.clienteNombre}
              </div>
              <div className="text-[11px] font-mono text-gray-700 mt-0.5">
                {esRuc20 ? `RUC Nº ${contrato.empresaRuc || contrato.clienteDni}` : (
                  esRuc10 ? `RUC Nº ${contrato.clienteDni} · DNI Nº ${dniDoc.substring(2, 10)}` : `DNI Nº ${contrato.clienteDni}`
                )}
              </div>
              {esRuc20 && (
                <div className="text-[10px] text-gray-600 mt-1 border-t border-gray-200 pt-1">
                  <div><strong>Representante:</strong> {contrato.empresaRepresentanteNombre}</div>
                  <div><strong>DNI Rep.:</strong> {contrato.empresaRepresentanteDocumento}</div>
                  <div><strong>Cargo:</strong> {contrato.empresaRepresentanteCargo}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ANEXO 1. CRONOGRAMA DE PAGOS ── */}
      <div className="page-break-before pt-8 mt-12 border-t-2 border-[#2A2220]">
        <div className="text-center mb-6">
          <h2 className="text-base sm:text-lg font-serif font-bold uppercase tracking-wider text-[#2A2220]">
            ANEXO 1. CRONOGRAMA DE PAGOS
          </h2>
          <p className="text-xs text-gray-500 italic mt-0.5">
            Condiciones financieras formalizadas para el Contrato Nº {contrato.numeroContrato}
          </p>
        </div>

        {/* Resumen del crédito */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-5 text-[11px]">
          <div>
            <span className="text-gray-500 block">Capital aprobado:</span>
            <span className="font-bold font-mono text-xs">S/ {totalCapital.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Plazo del crédito:</span>
            <span className="font-bold">{contrato.plazoMeses} cuotas mensuales</span>
          </div>
          <div>
            <span className="text-gray-500 block">Tasa Efectiva Anual (TEA):</span>
            <span className="font-bold font-mono">{teaPorcentaje}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Cuota mensual fija:</span>
            <span className="font-bold font-mono text-xs text-[#9C4A2B]">S/ {Number(contrato.cuotaFija || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Tabla de 7 Columnas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs border border-gray-300">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-[11px] font-bold uppercase text-gray-700">
                <th className="py-2 px-2.5 border-r border-gray-300 text-center w-10">N°</th>
                <th className="py-2 px-2.5 border-r border-gray-300">Vencimiento</th>
                <th className="py-2 px-2.5 border-r border-gray-300 text-end">Saldo Inicial (S/)</th>
                <th className="py-2 px-2.5 border-r border-gray-300 text-end">Cuota (S/)</th>
                <th className="py-2 px-2.5 border-r border-gray-300 text-end">Interés (S/)</th>
                <th className="py-2 px-2.5 border-r border-gray-300 text-end">Capital (S/)</th>
                <th className="py-2 px-2.5 text-end">Saldo Capital (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cuotasLista.map((c) => {
                const saldoInicialCuota = c.saldoInicial != null
                  ? Number(c.saldoInicial)
                  : ((Number(c.saldoCapital) || 0) + (Number(c.capital) || 0));

                return (
                  <tr key={c.numero} className="hover:bg-gray-50">
                    <td className="py-1.5 px-2.5 text-center font-mono border-r border-gray-300">{c.numero}</td>
                    <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono text-gray-600">
                      {formatearFecha(c.fechaVencimiento)}
                    </td>
                    <td className="py-1.5 px-2.5 text-end font-mono border-r border-gray-300">
                      {saldoInicialCuota.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-end font-mono font-bold border-r border-gray-300">
                      {Number(c.monto).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-end font-mono border-r border-gray-300 text-gray-600">
                      {Number(c.interes).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-end font-mono border-r border-gray-300">
                      {Number(c.capital).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-end font-mono">
                      {Number(c.saldoCapital).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t border-gray-300 text-[11px]">
                <td colSpan={2} className="py-2 px-2.5 text-end uppercase border-r border-gray-300">
                  Totales:
                </td>
                <td className="py-2 px-2.5 text-end font-mono border-r border-gray-300">-</td>
                <td className="py-2 px-2.5 text-end font-mono border-r border-gray-300">
                  S/ {totalPagar.toFixed(2)}
                </td>
                <td className="py-2 px-2.5 text-end font-mono border-r border-gray-300">
                  S/ {totalIntereses.toFixed(2)}
                </td>
                <td className="py-2 px-2.5 text-end font-mono border-r border-gray-300">
                  S/ {totalCapital.toFixed(2)}
                </td>
                <td className="py-2 px-2.5 text-end font-mono">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pie de página institucional del emisor */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-500 uppercase tracking-wider">
          {emisorRazonSocial} · Documento Contractual Generado por Sistema PagaOPiu
        </div>
      </div>
    </div>
  );
}
