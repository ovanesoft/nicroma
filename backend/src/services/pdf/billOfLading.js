const PDFDocument = require('pdfkit');
const { drawTenantLogo } = require('./pdfHelpers');

// Términos y condiciones que van al dorso del BL (página 2)
const TERMINOS_Y_CONDICIONES = [
  ['Definitions', '"BL" means Bill of Lading - "Carrier" means the Multimodal Transport Operator who issues this BL and is named on the face of it and assumes liability for the performance of the multimodal transport contract as a carrier. - "Merchant" means and includes the Shipper, the Consignor, the Consignee, the Holder of this BL, the Receiver and the Owner of the Goods. - "Consignor" means the person who concludes the multimodal transport contract with the Carrier. - "Consignee" means the person entitled to receive the goods from the Carrier. - "Taken in charge" means that the goods have been handed over to and accepted for carriage by the Carrier at the place of receipt evidenced in this BL. - "Goods" means any property including live animals as well as containers, pallets or similar articles of transport or packaging not supplied by the Carrier, irrespective of whether such property is to be or is carried on or under deck.'],
  ['1. Applicability', 'Notwithstanding the heading "Multimodal Transport" these conditions shall also apply if only one mode of transport is used.'],
  ['2. Issuance of this BL', '2.1 By issuance of this BL the Carrier a) undertakes to perform and/or in his own name to procure the performance of the entire transport, from the place at which the goods are taken in charge (place of receipt evidenced in this BL) to the place of delivery designated in this BL; b) assumes liability as set out in these conditions. 2.2 Subject to the conditions of this BL the Carrier shall be responsible for the acts and omissions of his servants or agents acting within the scope of their employment, or any other person of whose services he makes use for the performance of the contract evidenced by this BL, as if such acts and omissions were his own.'],
  ['3. Negotiability and title to the goods', '3.1 This BL is issued in a negotiable form unless it is marked "non negotiable". It shall constitute title to the goods and the holder, by endorsement of this BL, shall be entitled to receive or to transfer the goods herein mentioned. 3.2 The information in this BL shall be prima facie evidence of the taking in charge by the Carrier of the goods as described by such information unless a contrary indication, such as "shipper\'s weight, load and count", "shipper-packed container" or similar expressions, has been made in the printed text or superimposed on this BL. However, proof to the contrary shall not be admissible when the BL has been transferred to the consignee for valuable consideration who in good faith has relied and acted thereon.'],
  ['4. Dangerous Goods and Indemnity', '4.1 The Merchant shall comply with rules which are mandatory according to the national law or by reason of International Convention, relating to the carriage of goods of a dangerous nature, and shall in any case inform the Carrier in writing of the exact nature of the danger, before goods of a dangerous nature are taken in charge by the Carrier and indicate to him, if need be, the precautions to be taken. 4.2 If the Merchant fails to provide such information and the Carrier is unaware of the dangerous nature of the goods and the necessary precautions to be taken and if, at any time, they are deemed to be a hazard to life or property, they may at any place be unloaded, destroyed or rendered harmless, as circumstances may require, without compensation. The Merchant shall indemnify the Carrier against all loss, damage, liability, or expense arising out of their being taken in charge, or their carriage, or of any service incidental thereto. The burden of proving that the Carrier knew the exact nature of the danger constituted by the carriage of the said goods shall rest on the Merchant. 4.3 If any goods shall become a danger to life or property, they may in like manner be unloaded or landed at any place or destroyed or rendered harmless. If such danger was not caused by the fault and neglect of the Carrier he shall have no liability and the Merchant shall indemnify him against all loss, damage, liability and expense arising therefrom.'],
  ['5. Description of Goods and Merchant\'s Packing and Inspection', '5.1 The Consignor shall be deemed to have guaranteed to the Carrier the accuracy, at the time the goods were taken in charge by the Carrier, of all particulars relating to the general nature of the goods, their marks, number, weight, volume and quantity and, if applicable, to the dangerous character of the goods, as furnished by him or on his behalf for insertion on the BL. The Consignor shall indemnify the Carrier against all loss, damage and expense resulting from any inaccuracy or inadequacy of such particulars. The Consignor shall remain liable even if the BL has been transferred by him. The right of the Carrier to such an indemnity shall in no way limit his liability under this BL to any person other than the Consignor. 5.2 The Carrier shall not be liable for any loss, damage or expense caused by defective or insufficient packing of goods or by inadequate loading or packing within containers or other transport units when such loading or packing has been performed by the Merchant or on his behalf by a person other than the Carrier, or by the defect or unsuitability of the containers or other transport units supplied by the Merchant, or if supplied by the Carrier if a defect or unsuitability of the container or other transport unit would have been apparent upon reasonable inspection by the Merchant. The Merchant shall indemnify the Carrier against all loss, damage, liability and expense so caused.'],
  ['6. Carrier\'s Liability', '6.1 The responsibility of the Carrier for the goods under these conditions covers the period from the time the Carrier has taken the goods in his charge to the time of their delivery. 6.2 The Carrier shall be liable for loss of or damage to the goods as well as for delay in delivery if the occurrence which caused the loss, damage or delay in delivery took place while the goods were in his charge as defined in Clause 2.1.a, unless the Carrier proves that no fault or neglect of his own, his servants or agents or any other person referred to in Clause 2.2. has caused or contributed to such loss, damage or delay. However, the Carrier shall only be liable for loss following from delay in delivery if the Consignor has made a declaration of interest in timely delivery which has been accepted by the Carrier and stated in this BL. 6.3 Arrival times are not guaranteed by the Carrier, however, delay in delivery occurs when the goods have not been delivered within the time expressly agreed upon or, in the absence of such agreement, within the time which would be reasonable to require of a diligent Carrier, having regard to the circumstances of the case. 6.4 If the goods have not been delivered within ninety consecutive days following such date of delivery as determined in Clause 6.3., the claimant may, in the absence of evidence to the contrary, treat the goods as lost. 6.5 When the Carrier establishes that, in the circumstances of the case, the loss or damage could be attributed to one or more causes or events, specified in a - e of the present clause, it shall be presumed that it was so caused, always provided, however, that the claimant shall be entitled to prove that the loss or damage was not, in fact, caused wholly or partly by one or more of such causes or events: a) an act or omission of the Merchant, or person other than the Carrier acting on behalf of the Merchant or from whom the Carrier took the goods in charge; b) insufficiency or defective condition of the packaging or marks and/or numbers; c) handling, loading, stowage or unloading of the goods by the Merchant or any person acting on behalf of the Merchant; d) inherent vice of the goods; e) strike, lockout, stoppage or restraint of labour. 6.6 Defences for carriage by sea or inland waterways: Notwithstanding Clauses 6.2., 6.3. and 6.4. the Carrier shall not be liable for loss, damage or delay in delivery with respect to goods carried by sea or inland waterways when such loss, damage or delay during such carriage has been caused by: a) act, neglect, or default of the master, mariner, pilot or the servants of the carrier in the navigation or in the management of the ship, b) fire, unless caused by the actual fault or privity of the carrier, however, always provided that whenever loss or damage has resulted from unseaworthiness of the ship, the Carrier can prove that due diligence has been exercised to make the ship seaworthy at the commencement of the voyage.'],
  ['7. Paramount Clauses', '7.1 These conditions shall only take effect to the extent that they are not contrary to the mandatory provisions of International Conventions or national law applicable to the contract evidenced by this BL. 7.2 The Hague Rules contained in the International Convention for the unification of certain rules relating to Bills of Lading, dated Brussels 25th August 1924, or in those countries where there are already in force the Hague-Visby Rules contained in the Protocol of Brussels, dated 23rd February 1968, as enacted in the Country of Shipment, shall apply to all carriage of goods by sea and also to the carriage of goods by inland waterways, and such provisions shall apply to all goods whether carried on deck or under deck. 7.3 The Carriage of Goods by Sea Act of the United States of America (COGSA) shall apply to the carriage of goods by sea, whether on deck or under deck, if compulsorily applicable to this BL or would be applicable but for the goods being carried on deck in accordance with a statement on this BL.'],
  ['8. Limitation of Carrier Liability', '8.1 Assessment of compensation for loss of or damage to the goods shall be made by reference to the value of such goods at the place and time they are delivered to the consignee or at the place and time when, in accordance with this BL, they should have been so delivered. 8.2 The value of the goods shall be determined according to the current commodity exchange price or, if there is no such price, according to the current market price or, if there are no such prices, by reference to the normal value of goods of the same name and quality. 8.3 Subject to the provisions of subclauses 8.4. to 8.9. inclusive, the Carrier shall in no event be or become liable for any loss of or damage to the goods in an amount exceeding the equivalent of 666.67 SDR per package or unit or 2 SDR per kilogramme of gross weight of the goods lost or damaged, whichever is the higher, unless the nature and value of the goods shall have been declared by the Consignor and accepted by the Carrier before the goods have been taken in his charge, or the ad valorem freight rate paid, and such value is stated in the BL by him, then such declared value shall be the limit. 8.4 Where a container, pallet or similar article of transport is loaded with more than one package or unit, the packages or other shipping units enumerated in the BL as packed in such article of transport are deemed packages or shipping units. Except as aforesaid, such article of transport shall be considered the package or unit. 8.5 Notwithstanding the above mentioned provisions, if the multimodal transport does not, according to the contract, include carriage of goods by sea or by inland waterways, the liability of the Carrier shall be limited to an amount not exceeding 8.33 SDR per kilogramme of gross weight of the goods lost or damaged. 8.6 a) When the loss of or damage to the goods occurred during one particular stage of the multimodal transport, in respect of which an applicable international convention or mandatory national law would have provided another limit of liability if a separate contract of carriage had been made for that particular stage of transport, then the limit of the Carrier\'s liability for such loss or damage shall be determined by reference to the provisions of such convention or mandatory national law. b) Unless the nature and value of the goods shall have been declared by the Merchant and inserted in this BL, and the ad valorem freight rate paid, the liability of the Carrier under COGSA, where applicable, shall not exceed US$ 500 per package or, in the case of goods not shipped in packages, per customary freight unit. 8.7 If the Carrier is liable in respect of loss following from delay in delivery, or consequential loss or damage other than loss of or damage to the goods, the liability of the Carrier shall be limited to an amount not exceeding the equivalent of twice the freight under the multimodal contract for the multimodal transport under this BL. 8.8 The aggregate liability of Carrier shall not exceed the limits of liability for total loss of the goods. 8.9 The Carrier is not entitled to the benefit of the limitation of liability if it is proved that the loss, damage or delay in delivery resulted from a personal act or omission of the Carrier done with the intent to cause such loss, damage or delay, or recklessly and with knowledge that such loss, damage or delay would probably result.'],
  ['9. Applicability to Actions in Tort', 'These conditions apply to all claims against the Carrier relating to the performance of the contract evidenced by this BL, whether the claim be founded in contract or in tort.'],
  ['10. Liability of Servants and other Persons', '10.1 These conditions apply whenever claims relating to the performance of the contract evidenced by this BL are made against any servant, agent or other person (including any independent contractor) whose services have been used in order to perform the contract, whether such claims are founded in contract or in tort, and the aggregate liability of the Carrier and of such servants, agents or other persons shall not exceed the limits in clause 8. 10.2 In entering into this contract as evidenced by this BL, the Carrier, to the extent of these provisions, does not only act on his own behalf, but also as agent or trustee for such persons, and such persons shall, to this extent, be deemed parties to this contract. 10.3 However, if it is proved that the loss of or such loss or damage to the goods resulted from a personal act or omission of such a person referred to in Clause 10.1., done with intent to cause damage, or recklessly and with knowledge that damage would probably result, such person shall not be entitled to benefit of limitation of liability provided for in Clause 8. 10.4 The aggregate of the amounts recoverable from the Carrier and the persons referred to in Clauses 2.2. and 10.1. shall not exceed the limits provided for in these conditions.'],
  ['11. Method and Route of Transportation', 'Without notice to the Merchant, the Carrier has the liberty to carry the goods on or under deck and to choose or substitute the means, route and procedure to be followed in the handling, stowage, storage and transportation of the goods.'],
  ['12. Delivery', '12.1 Goods shall be deemed to be delivered when they have been handed over or placed at the disposal of the Consignee or his agent in accordance with this BL, or when the goods have been handed over to any authority or other party to whom, pursuant to the law or regulation applicable at the place of delivery, the goods must be handed over, or such other place at which the Carrier is entitled to call upon the Merchant to take delivery. 12.2 The Carrier shall also be entitled to store the goods at the sole risk of the Merchant, and the Carrier\'s liability shall cease, and the cost of such storage shall be paid, upon demand, by the Merchant to the Carrier. 12.3 If at any time the carriage under this BL is or is likely to be affected by any hindrance or risk of any kind (including the condition of the goods) not arising from any fault or neglect of the Carrier or a person referred to in Clause 2.2. and which cannot be avoided by the exercise of reasonable endeavours the Carrier may: abandon the carriage of the goods under this BL and, where reasonably possible, place the goods or any part of them at the Merchant\'s disposal at any place which the Carrier may deem safe and convenient, whereupon delivery shall be deemed to have been made, and the responsibility of the Carrier in respect of such goods shall cease. In any event, the Carrier shall be entitled to full freight under this BL and the Merchant shall pay any additional costs resulting from the above mentioned circumstances.'],
  ['13. Freight and Charges', '13.1 Freight shall be paid in cash, without any reduction or deferment on account of any claim, counter-claim or set-off, whether prepaid or payable at destination. Freight shall be considered as earned by the Carrier at the moment when the goods have been taken in his charge, and not to be returned in any event. 13.2 Freight and all other amounts mentioned in this BL are to be paid in the currency named in this BL or, at the Carrier\'s option, in the currency of the country of dispatch or destination at the highest rate of exchange for bankers sight bills current for prepaid freight on the day of dispatch and for freight payable at destination on the day when the Merchant is notified on arrival of the goods there or on the date of withdrawal of the delivery order, whichever rate is the higher, or at the option of the Carrier on the date of this BL. 13.3 All dues, taxes and charges or other expenses in connection with the goods shall be paid by the Merchant. Where equipment is supplied by the Carrier, the Merchant shall pay all demurrage and charges which are not due to a fault or neglect of the Carrier. 13.4 The Merchant shall reimburse the Carrier in proportion to the amount of freight for any costs for deviation or delay or any other increase of costs of whatever nature caused by war, warlike operations, epidemics, strikes, government directions or force majeure. 13.5 The Merchant warrants the correctness of the declaration of contents, insurance, weight, measurements or value of the goods but the Carrier shall have the liberty to have the contents inspected and the weight, measurements or value verified. If on such inspection it is found that the declaration is not correct it is agreed that a sum equal either to five times the difference between the correct figure and the freight charged, or to double the correct freight less the freight charged, whichever sum is the smaller, shall be payable as liquidated damages to the Carrier for his inspection costs and losses of freight on other goods notwithstanding any other sum having been stated on this BL as freight payable. 13.6 Despite the acceptance by the Carrier of instructions to collect freight, charges or other expenses from any other person in respect of the transport under this BL, the Merchant shall remain responsible for such monies on receipt of evidence of demand and the absence of payment for whatever reason.'],
  ['14. Lien', 'The Carrier shall have a lien on the goods and any documents relating thereto for any amount due at any time to the Carrier from the Merchant including storage fees and the cost of recovering same, and may enforce such lien in any reasonable manner which he may think fit.'],
  ['15. General Average', 'The Merchant shall indemnify the Carrier in respect of any claims of a General Average nature which may be made on him and shall provide such security as may be required by the Carrier in this connection.'],
  ['16. Notice', '16.1 Unless notice of loss of or damage to the goods, specifying the general nature of such loss or damage, is given in writing by the consignee to the Carrier when the goods are delivered to the consignee in accordance with clause 12, such handing over is prima facie evidence of the delivery by the Carrier of the goods as described in this BL. 16.2 Where the loss or damage is not apparent, the same prima facie effect shall apply if notice in writing is not given within 6 consecutive days after the day when the goods were delivered to the consignee in accordance with clause 12.'],
  ['17. Time bar', 'The Carrier shall, unless otherwise expressly agreed, be discharged of all liability under these conditions unless suit is brought within 9 months after the delivery of the goods, or the date when the goods should have been delivered, or the date when in accordance with clause 6.4. failure to deliver the goods would give the consignee the right to treat the goods as lost.'],
  ['18. Partial Invalidity', 'If any clause or a part thereof is held to be invalid, the validity of this BL and the remaining clauses or a part thereof shall not be affected.'],
  ['19. Jurisdiction and applicable law', 'Actions against the Carrier may be instituted only in the place where the Carrier has his place of business as stated on the reverse of this BL and shall be decided according to the law of the country in which that place of business is situated.']
];

/**
 * Genera un Bill of Lading con el formato clásico de cajas + términos y
 * condiciones al dorso (página 2).
 * Los datos se toman de la carpeta pero pueden pisarse desde
 * carpeta.documentosData.bl (editados por el usuario).
 */
function generarBillOfLading(carpeta, tenant, logoBuffer = null) {
  const ov = carpeta.documentosData?.bl || {};

  const formatNumber = (v) => {
    if (v == null || v === '') return '';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);
  };

  // Datos default desde la carpeta
  const totalBultos = carpeta.mercancias?.reduce((s, m) => s + (m.bultos || 0), 0) || 0;
  const totalVolumen = carpeta.mercancias?.reduce((s, m) => s + (m.volumen || 0), 0) || 0;
  const totalPeso = carpeta.mercancias?.reduce((s, m) => s + (m.peso || 0), 0) || 0;

  const descripcionDefault = [
    ...(carpeta.mercancias?.map(m => m.descripcion).filter(Boolean) || []),
    ...(carpeta.contenedores?.map(c => {
      const parts = [c.tipo];
      if (c.numero) parts.push(c.numero);
      if (c.precinto) parts.push(c.precinto);
      return parts.join('/');
    }) || [])
  ].join('\n');

  const shipperDefault = carpeta.shipper
    ? `${carpeta.shipper.razonSocial}\n${carpeta.shipper.direccion || ''}\n${carpeta.shipper.email || ''}`
    : '';
  const consigneeDefault = carpeta.consignee
    ? `${carpeta.consignee.razonSocial} (CUIT ${carpeta.consignee.numeroDocumento || '-'})\n${carpeta.consignee.direccion || ''}`
    : (carpeta.cliente ? `${carpeta.cliente.razonSocial} (CUIT ${carpeta.cliente.numeroDocumento || '-'})\n${carpeta.cliente.direccion || ''}` : '');

  const hoy = new Date();
  const issueDefault = `${(carpeta.puertoOrigen || '').toUpperCase()}, ${hoy.getFullYear()}/${hoy.getMonth() + 1}/${hoy.getDate()}`;

  const d = {
    blNumber: ov.blNumber ?? (carpeta.houseBL || carpeta.numero),
    references: ov.references ?? (carpeta.referenciaInterna || carpeta.referenciaCliente || ''),
    exportReferences: ov.exportReferences ?? '',
    shipper: ov.shipper ?? shipperDefault,
    consignee: ov.consignee ?? consigneeDefault,
    notifyParty: ov.notifyParty ?? (carpeta.notify || 'SAME AS CONSIGNEE'),
    routingInstructions: ov.routingInstructions ?? '',
    originCountry: ov.originCountry ?? '',
    forwardingAgent: ov.forwardingAgent ?? `${tenant?.name || ''}\nAGENTE DE TRANSPORTE ADUANERO`,
    deliveryApplyTo: ov.deliveryApplyTo ?? '',
    placeOfReceipt: ov.placeOfReceipt ?? (carpeta.lugarCarga || carpeta.puertoOrigen || ''),
    vessel: ov.vessel ?? [carpeta.buque, carpeta.viaje].filter(Boolean).join(' '),
    portOfLoading: ov.portOfLoading ?? (carpeta.puertoOrigen || ''),
    finalDestination: ov.finalDestination ?? (carpeta.puertoDestino || ''),
    typeOfMove: ov.typeOfMove ?? (carpeta.tipoOperacion || ''),
    portOfDischarge: ov.portOfDischarge ?? (carpeta.puertoDestino || ''),
    placeOfDelivery: ov.placeOfDelivery ?? (carpeta.lugarDescarga || carpeta.puertoDestino || ''),
    freightPayableAt: ov.freightPayableAt ?? 'DESTINATION',
    numberOfOriginals: ov.numberOfOriginals ?? '3',
    marksNumbers: ov.marksNumbers ?? 'N/M',
    packages: ov.packages ?? `${totalBultos}`,
    description: ov.description ?? descripcionDefault,
    kilograms: ov.kilograms ?? `${formatNumber(totalPeso)}KGS`,
    cubicMeters: ov.cubicMeters ?? `${formatNumber(totalVolumen)}CBM`,
    freightText: ov.freightText ?? `Freight: FREIGHT ${(carpeta.prepaidCollect || 'Collect').toUpperCase() === 'COLLECT' ? 'COLLECT' : 'PREPAID'} | AS ARRANGED`,
    placeDateOfIssue: ov.placeDateOfIssue ?? issueDefault,
    signedFor: ov.signedFor ?? (tenant?.name || '')
  };

  const doc = new PDFDocument({
    size: 'A4',
    margin: 25,
    info: {
      Title: `Bill of Lading - ${d.blNumber}`,
      Author: tenant?.name || 'Sistema',
      Subject: 'Bill of Lading'
    }
  });

  const border = '#000000';
  const labelColor = '#444444';
  const W = doc.page.width - 50; // ancho útil
  const X = 25;
  const HALF = W / 2;

  // Helper: caja con label y contenido
  const box = (x, y, w, h, label, content, opts = {}) => {
    doc.rect(x, y, w, h).strokeColor(border).lineWidth(0.7).stroke();
    doc.fontSize(5.5).fillColor(labelColor).font('Helvetica');
    doc.text(label, x + 3, y + 3, { width: w - 6 });
    if (content) {
      doc.fontSize(opts.fontSize || 7.5).fillColor('#000').font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(content, x + 3, y + 11, { width: w - 6, height: h - 13, ellipsis: false });
    }
  };

  // ============ PÁGINA 1: BL ============
  let y = 25;

  // Título
  doc.fontSize(13).fillColor('#000').font('Helvetica-Bold');
  doc.text('BILL OF LADING', X, y);
  doc.fontSize(9).font('Helvetica');
  doc.text('ORIGINAL', X + W - 100, y + 2, { width: 100, align: 'right' });

  // Logo del tenant (centro-derecha del header)
  drawTenantLogo(doc, logoBuffer, { right: 160, top: 20, maxWidth: 80, maxHeight: 30 });
  y += 20;

  // Fila 1: Shipper (izq, alto) | BL no + References (der)
  const rowH1 = 70;
  box(X, y, HALF, rowH1, 'Shipper / Exporter', d.shipper);
  box(X + HALF, y, HALF / 2, 24, 'Bill of Lading no', d.blNumber, { bold: true, fontSize: 8 });
  box(X + HALF + HALF / 2, y, HALF / 2, 24, 'References N°', d.references);
  box(X + HALF, y + 24, HALF, rowH1 - 24, 'Export References', d.exportReferences);
  y += rowH1;

  // Fila 2: Consignee | Routing Instructions
  const rowH2 = 55;
  box(X, y, HALF, rowH2, 'Consignee', d.consignee);
  box(X + HALF, y, HALF, rowH2, 'Routing Instructions', d.routingInstructions);
  y += rowH2;

  // Fila 3: Notify | Origin + Forwarding agent
  const rowH3 = 55;
  box(X, y, HALF, rowH3, 'Notify Party', d.notifyParty);
  box(X + HALF, y, HALF, 22, 'Point and Country of Origin of Goods', d.originCountry);
  box(X + HALF, y + 22, HALF, rowH3 - 22, 'Forwarding Agent References', d.forwardingAgent);
  y += rowH3;

  // Fila 4: Place of receipt | For delivery apply to
  const rowH4 = 32;
  box(X, y, HALF, rowH4, 'Place of Receipt by pre carrier', d.placeOfReceipt);
  box(X + HALF, y, HALF, rowH4, 'For delivery please apply to', d.deliveryApplyTo);
  y += rowH4;

  // Fila 5: Vessel/Voyage | Port of Loading | Final Destination | Type of move
  const rowH5 = 28;
  const q = W / 4;
  box(X, y, q, rowH5, 'Vessel / Voyage', d.vessel);
  box(X + q, y, q, rowH5, 'Port of Loading', d.portOfLoading);
  box(X + q * 2, y, q, rowH5, 'Final Destination', d.finalDestination);
  box(X + q * 3, y, q, rowH5, 'Type of move', d.typeOfMove);
  y += rowH5;

  // Fila 6: Port of discharge | Place of delivery | Freight payable at | N° originals
  box(X, y, q, rowH5, 'Port of discharge', d.portOfDischarge);
  box(X + q, y, q, rowH5, 'Place of delivery by on carrier', d.placeOfDelivery);
  box(X + q * 2, y, q, rowH5, 'Freight payable at', d.freightPayableAt);
  box(X + q * 3, y, q, rowH5, 'Number of original Bill of Lading', d.numberOfOriginals);
  y += rowH5;

  // Cuerpo: Marks | Packages | Description | Kilograms | Cubic Meters
  const bodyH = 250;
  const colMarks = W * 0.16;
  const colPkgs = W * 0.13;
  const colDesc = W * 0.41;
  const colKg = W * 0.15;
  const colCbm = W * 0.15;

  box(X, y, colMarks, bodyH, 'Marks & Numbers', d.marksNumbers, { fontSize: 7 });
  box(X + colMarks, y, colPkgs, bodyH, 'No. Of Pallets Or Other Pckgs', d.packages, { fontSize: 7 });
  box(X + colMarks + colPkgs, y, colDesc, bodyH, 'Description', d.description, { fontSize: 7 });
  box(X + colMarks + colPkgs + colDesc, y, colKg, bodyH, 'Kilograms', d.kilograms, { fontSize: 7 });
  box(X + colMarks + colPkgs + colDesc + colKg, y, colCbm, bodyH, 'Cubic Meters', d.cubicMeters, { fontSize: 7 });
  y += bodyH;

  // Freight
  const rowF = 26;
  box(X, y, W * 0.6, rowF, 'Freight and Charges', d.freightText, { fontSize: 7.5 });
  box(X + W * 0.6, y, W * 0.4, rowF, 'Total', `${d.kilograms}    ${d.cubicMeters}`, { fontSize: 7.5 });
  y += rowF;

  // Legal + Issue + Signed
  const legalH = 76;
  const legalText = 'RECEIVED the goods or the containers, vans, trailers, pallet, units or other packages said to contain goods here in mentioned, in apparent good order and condition, except as otherwise indicated, to be transported, delivered or transshipped as provided herein, all of provision written, printed or stamped on either side hereof are part of the bill of lading contract. IN WITNESS whereof, the master or agent of said vessel has signed bills of lading, all of the same tenor and date, one of which be accomplished, the others to stand void.\nFREIGHT AND CHARGES AS AGREED';
  doc.rect(X, y, W * 0.6, legalH).strokeColor(border).lineWidth(0.7).stroke();
  doc.fontSize(6).fillColor('#000').font('Helvetica');
  doc.text(legalText, X + 3, y + 4, { width: W * 0.6 - 8, align: 'justify' });

  box(X + W * 0.6, y, W * 0.4, legalH / 2, 'Place and date of issue', d.placeDateOfIssue, { fontSize: 8, bold: true });
  box(X + W * 0.6, y + legalH / 2, W * 0.4, legalH / 2, 'Signed for', d.signedFor, { fontSize: 8 });

  // ============ PÁGINA 2: TÉRMINOS Y CONDICIONES ============
  doc.addPage({ size: 'A4', margin: 22 });
  doc.fontSize(8).fillColor('#000').font('Helvetica-Bold');
  doc.text('TERMS AND CONDITIONS', 22, 22, { align: 'center', width: doc.page.width - 44 });

  // Dos columnas de texto chico
  const colW = (doc.page.width - 44 - 12) / 2;
  const col1X = 22;
  const col2X = 22 + colW + 12;
  const topY = 38;
  const maxY = doc.page.height - 25;

  let colX = col1X;
  let ty = topY;

  TERMINOS_Y_CONDICIONES.forEach(([titulo, texto]) => {
    doc.font('Helvetica-Bold').fontSize(5);
    const hTitle = doc.heightOfString(titulo, { width: colW });
    doc.font('Helvetica').fontSize(4.6);
    const hText = doc.heightOfString(texto, { width: colW });

    // Salto de columna/página
    if (ty + hTitle + hText + 6 > maxY) {
      if (colX === col1X) {
        colX = col2X;
        ty = topY;
      } else {
        doc.addPage({ size: 'A4', margin: 22 });
        colX = col1X;
        ty = 30;
      }
    }

    doc.font('Helvetica-Bold').fontSize(5).fillColor('#000');
    doc.text(titulo, colX, ty, { width: colW });
    ty += hTitle + 1;
    doc.font('Helvetica').fontSize(4.6).fillColor('#222');
    doc.text(texto, colX, ty, { width: colW, align: 'justify' });
    ty += hText + 5;
  });

  return doc;
}

module.exports = { generarBillOfLading };
