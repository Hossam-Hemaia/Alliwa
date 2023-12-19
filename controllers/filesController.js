const path = require("path");
const utilities = require("../utilities/utils");
const taqnyatApi = require("../utilities/taqnyatAPI");

exports.getInvoice = async (req, res, next) => {
  try {
    const fileType = req.query.fileType;
    const headerId = req.query.headerId;
    const invoiceId = req.query.invoiceId;
    const withMessage = req.query.withMessage;
    const messageBearer = req.query.messageBearer;
    const phoneNumber = req.query.phoneNumber;
    const email = req.query.email;
    const ccMail = req.query.ccMail;
    const message = req.query.message;
    let document;
    let fileUrl;
    const header = await utilities.getMainHeader(headerId);
    const invHeader = await utilities.getInvoiceHeader(invoiceId);
    const barcodeImg = await utilities.createBarcode(invHeader.inv_no);
    const qrCodeImg = await utilities.createQrcode(invHeader.qr);
    const invBody = await utilities.getInvoiceDetails(invoiceId);
    const invoiceData = {};
    const invoiceHeader = {
      sellerCompany: header?.r_company_name,
      sellerBranch: header?.r_branch_name,
      sellerAddress: header?.r_address,
      sellerNumbers: header?.r_phone,
      commRecord: header?.r_cs_no,
      taxNumber: header?.r_tax_no,
      l_sellerCompany: header?.l_company_name,
      l_sellerBranch: header?.l_branch_name,
      l_sellerAddress: header?.l_address,
      l_sellerNumbers: header?.l_phone,
      l_commRecord: header?.l_cs_no,
      l_taxNumber: header?.l_tax_no,
      invoiceNumber: invHeader?.inv_no,
      invoiceDate: invHeader?.inv_date,
      currency: invHeader?.cur_id,
      invoiceType: invHeader?.inv_type_id,
      supplyDate: invHeader?.del_date,
      dueDate: invHeader?.due_date,
      customer: invHeader?.part_id,
      customerTaxNumber: invHeader?.part_tax_flag,
      customerAddress: invHeader?.part_address,
      city: invHeader?.city,
      country: invHeader?.country,
      custCommRecord: invHeader?.part_tax_no,
      subAccount: invHeader?.sub_part_id,
      barcode: barcodeImg,
      qrCode: qrCodeImg,
      logo: path.join("assets", "img", "logo.jpeg"),
      transType: invHeader?.trans_type_id,
    };
    let itemsCount = 0;
    let qtyTotal = 0;
    let totalPrice = 0;
    const invoiceBody = [];
    for (let body of invBody) {
      let bodyRow = {};
      bodyRow.voucherNumber = body?.dln_id;
      bodyRow.item = body?.item_id + " - " + body?.itvar_id;
      bodyRow.unit = body?.uom_id;
      bodyRow.quantity = body?.qty;
      bodyRow.priceBeforeTax = body?.price;
      bodyRow.netAmountBeforeTax = body?.net_excl;
      bodyRow.taxRatio = body?.tax_per;
      bodyRow.taxAmount = body?.tax_val;
      bodyRow.netAmountWithTax = body?.gross_incl;
      ++itemsCount;
      qtyTotal += body?.qty;
      totalPrice += body?.gross_incl;
      invoiceBody.push(bodyRow);
    }
    const invSummary = {
      totalBeforTax: invHeader?.tot_price_excl,
      totalDiscount: invHeader?.item_dis_excl,
      netBeforTax: invHeader?.net_excl,
      totalTax: invHeader?.tax_val,
      totalAfterTax: invHeader?.gross_incl,
    };
    const invoiceDue = {
      totalDuo: invHeader?.tot_paid,
      totalPaid: invHeader?.net_due,
    };
    const itemSummary = [{ item: itemsCount, qty: qtyTotal, pric: totalPrice }];
    const taxSummary = [
      {
        tax: invHeader?.tax_val,
        ratio: invBody[0]?.tax_per,
        amount: invHeader?.tax_val,
      },
    ];
    invoiceData.invHeader = invoiceHeader;
    invoiceData.invBody = invoiceBody;
    invoiceData.invFooter = invSummary;
    invoiceData.invDuo = invoiceDue;
    invoiceData.itemSummary = itemSummary;
    invoiceData.taxSummary = taxSummary;
    invoiceData.username = req.query.username;
    if (fileType === "pdf") {
      document = await utilities.createPdfDoc(invoiceData);
      fileUrl = `${req.protocol}s://${req.get("host")}/files/pdfs/${document}`;
    } else if (fileType === "xlsx") {
      document = await utilities.createExcelDoc(invoiceData);
      fileUrl = `${req.protocol}s://${req.get("host")}/files/xls/${document}`;
    }
    let messageResponse;
    if (withMessage === "true") {
      if (messageBearer === "whatsapp") {
        console.log(fileUrl);
        messageResponse = await taqnyatApi.sendMessage(
          "+" + phoneNumber,
          message,
          fileUrl
        );
      } else if (messageBearer === "email") {
        await utilities.emailSender(email, ccMail, document, fileUrl, message);
      }
    }
    await utilities.deleteInvoiceFile(document, fileType);
    setTimeout(async () => {
      const fileUpload = await utilities.uploadInvoice(document, fileType);
      console.log(fileUpload);
    }, 5000);
    res.status(200).json({ success: true, url: fileUrl });
  } catch (err) {
    next(err);
  }
};

exports.whatsappOptIn = async (req, res, next) => {
  try {
    const contacts = req.body.contacts;
    const registerContacts = await taqnyatApi.enableContacts(contacts);
    res.status(201).json({
      success: true,
      status: registerContacts.contacts,
      message: "Contacts opted-in",
    });
  } catch (err) {
    next(err);
  }
};

exports.whatsappMessage = async (req, res, next) => {
  try {
    const { phoneNumber, messageType, message } = req.body;
    let fileUrl = "";
    const messageResponse = await taqnyatApi.sendMessage(
      phoneNumber,
      messageType,
      message,
      fileUrl
    );
    res.status(201).json({
      success: true,
      status: messageResponse,
      message: "message sent",
    });
  } catch (err) {
    next(err);
  }
};
