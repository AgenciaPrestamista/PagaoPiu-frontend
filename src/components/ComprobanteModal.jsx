import React from 'react';

export default function ComprobanteModal({ pago, onCerrar }) {
  if (!pago) return null;

  const esFactura = pago.tipoComprobante === 'FACTURA' || (pago.clienteDocumento && pago.clienteDocumento.length === 11);
  const tipoTitulo = esFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
  const serieNumero = pago.numeroComprobante || (esFactura ? `F001-${String(pago.id).padStart(6, '0')}` : `B001-${String(pago.id).padStart(6, '0')}`);
  const codigoPrestamo = `PRE-${String(pago.prestamoId || pago.id).padStart(6, '0')}`;

  const fechaEmision = pago.fechaPago
    ? pago.fechaPago.split('-').reverse().join('/')
    : new Date().toLocaleDateString('es-PE');

  const handleImprimir = () => {
    window.print();
  };

  const descripcionItem = pago.tipo === 'CANCELACION_ANTICIPADA'
    ? 'Liquidación y cancelación total anticipada de préstamo'
    : esFactura
      ? `Intereses por préstamo${pago.cuotaNumero ? ` (Cuota N.° ${pago.cuotaNumero})` : ''}`
      : `Pago de cuota de préstamo${pago.cuotaNumero ? ` N.° ${pago.cuotaNumero}` : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden my-6 border border-[#E3D3C2]">
        
        {/* Barra de control superior (no se imprime) */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#F1E4D6] border-b border-[#E3D3C2] no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#2A2220] uppercase tracking-wider">
              Comprobante de Pago Electrónico
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImprimir}
              className="h-8 px-4 text-xs font-bold rounded-lg bg-[#9C4A2B] text-white hover:bg-[#823B20] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="h-8 px-3 text-xs font-semibold rounded-lg bg-white border border-[#E3D3C2] text-[#6E625B] hover:bg-gray-100 transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COMPROBANTE IMPRIMIBLE (Formato Caja / ASCII Solicitado) */}
        {/* ======================================================== */}
        <div id="comprobante-imprimible" className="printable-comprobante p-6 sm:p-8 bg-white text-[#2A2220] font-mono text-xs leading-tight">
          <div className="border-2 border-black p-5 rounded-none sm:rounded-sm">
            
            {/* CABECERA */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pb-4 border-b border-black items-center">
              <div className="sm:col-span-7">
                <div className="font-bold text-sm tracking-wider uppercase font-serif">
                  PRESTAMOS CASTILLO
                </div>
                <div className="text-[11px] text-gray-700 mt-1">
                  <strong>RUC:</strong> 20608912345
                </div>
                <div className="text-[11px] text-gray-700">
                  <strong>Dirección:</strong> Av. Larco 456, Trujillo
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Agencia: {pago.sucursalNombre || 'Trujillo'} · Asesor: {pago.asesorNombre || 'Caja Ventanilla'}
                </div>
              </div>

              <div className="sm:col-span-5 text-center border-2 border-black p-3 bg-gray-50/50">
                <div className="text-[11px] font-bold">R.U.C. 20608912345</div>
                <div className="text-xs font-bold uppercase my-1 text-[#9C4A2B] tracking-wide">
                  {tipoTitulo}
                </div>
                <div className="text-sm font-bold tracking-widest text-black">
                  {serieNumero}
                </div>
              </div>
            </div>

            {/* DATOS DEL CLIENTE */}
            <div className="py-3 border-b border-black">
              <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-800">
                DATOS DEL CLIENTE
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-gray-600">{esFactura ? 'Razón social:' : 'Cliente:'}</span>{' '}
                  <strong className="text-black">{pago.clienteNombre || 'CLIENTE REGISTRADO'}</strong>
                </div>
                <div>
                  <span className="text-gray-600">{esFactura ? 'RUC:' : 'DNI:'}</span>{' '}
                  <strong className="text-black">{pago.clienteDocumento || '—'}</strong>
                </div>
                <div>
                  <span className="text-gray-600">Dirección:</span>{' '}
                  <span>{pago.clienteDireccion || (esFactura ? 'Av. Industrial 456, Trujillo' : 'Dirección registrada en RENIEC')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fecha de emisión:</span>{' '}
                  <strong className="text-black">{fechaEmision}</strong>
                </div>
              </div>
            </div>

            {/* DESCRIPCIÓN DE LA OPERACIÓN */}
            <div className="py-3 border-b border-black">
              <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-gray-800">
                DESCRIPCIÓN DE LA OPERACIÓN
              </div>
              
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-dashed border-black text-[11px] uppercase">
                    <th className="py-1.5 w-12 text-center">Cant.</th>
                    <th className="py-1.5 px-2">Descripción</th>
                    <th className="py-1.5 text-end w-28">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 text-center font-bold">1</td>
                    <td className="py-2 px-2">
                      <div className="font-medium">{descripcionItem}</div>
                      {pago.montoCapital && pago.montoInteres && (
                        <div className="text-[10px] text-gray-600 font-sans mt-0.5">
                          (Amortización Capital: S/ {Number(pago.montoCapital).toFixed(2)} | Interés compensatorio: S/ {Number(pago.montoInteres).toFixed(2)})
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-end font-bold">
                      S/ {Number(pago.monto).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TOTALES */}
            <div className="py-3 border-b border-black flex justify-end">
              <div className="w-full sm:w-80 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-700">Valor de operación:</span>
                  <span className="font-bold">S/ {Number(pago.monto).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IGV:</span>
                  <span>{esFactura ? 'Según régimen' : 'S/ 0.00'}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-black pt-1.5 text-sm font-bold">
                  <span className="text-[#9C4A2B]">TOTAL:</span>
                  <span className="text-black">S/ {Number(pago.monto).toFixed(2)}*</span>
                </div>
              </div>
            </div>

            {/* OBSERVACIONES Y LEYENDA FISCAL */}
            <div className="pt-3 text-[11px] space-y-1 text-gray-800">
              <div>
                <strong>Observaciones:</strong>
              </div>
              <div>Préstamo N.° {codigoPrestamo}</div>
              <div>Cuota relacionada: N.° {pago.cuotaNumero || '1'}</div>
              {pago.saldoRestante !== undefined && pago.saldoRestante !== null && (
                <div className="text-gray-600">
                  Saldo de capital restante: S/ {Number(pago.saldoRestante).toFixed(2)}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-dashed border-black text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider space-y-0.5">
                <div>DOCUMENTO SIMULADO PARA FINES ACADÉMICOS</div>
                <div>SIN VALIDEZ COMO COMPROBANTE TRIBUTARIO</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
