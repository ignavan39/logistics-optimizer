import { generateInvoice, type InvoiceData } from './index';

describe('generateInvoice', () => {
  const validInvoiceData: InvoiceData = {
    number: 'INV-2024-001',
    date: '2024-01-15',
    dueDate: '2024-02-15',
    seller: {
      name: 'ООО "Логистическая Компания"',
      inn: '7712345678',
      kpp: '771201001',
      address: 'г. Москва, ул. Примерная, д. 1',
      phone: '+7 (495) 123-45-67',
    },
    buyer: {
      name: 'ООО "Покупатель"',
      inn: '7723456789',
      kpp: '772201001',
      address: 'г. Санкт-Петербург, Невский пр., д. 10',
    },
    items: [
      {
        name: 'Доставка груза Москва - Санкт-Петербург',
        quantity: 1,
        price: 10000,
        total: 10000,
        vat: 0,
      },
      {
        name: 'Дополнительная упаковка',
        quantity: 2,
        price: 500,
        total: 1000,
        vat: 0,
      },
    ],
    subtotal: 11000,
    vatRate: 20,
    vatAmount: 2200,
    total: 13200,
    paymentTerms: '30 дней',
  };

  it('should generate PDF buffer', async () => {
    const result = await generateInvoice(validInvoiceData);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should generate PDF with minimum size', async () => {
    const result = await generateInvoice(validInvoiceData);

    expect(result.length).toBeGreaterThan(1024);
  });

  it('should generate PDF that starts with PDF header', async () => {
    const result = await generateInvoice(validInvoiceData);
    const headerBytes = result.slice(0, 4);
    const header = String.fromCharCode(...headerBytes);

    expect(header).toBe('%PDF');
  });

  it('should generate unique PDFs for different data', async () => {
    const result1 = await generateInvoice(validInvoiceData);

    const differentData: InvoiceData = {
      ...validInvoiceData,
      number: 'INV-2024-002',
    };

    const result2 = await generateInvoice(differentData);

    const str1 = Buffer.from(result1).toString('base64');
    const str2 = Buffer.from(result2).toString('base64');
    expect(str1).not.toBe(str2);
  });

  it('should handle invoice without seller KPP', async () => {
    const dataWithoutKpp: InvoiceData = {
      ...validInvoiceData,
      seller: {
        name: validInvoiceData.seller.name,
        inn: validInvoiceData.seller.inn,
        address: validInvoiceData.seller.address,
      },
    };

    const result = await generateInvoice(dataWithoutKpp);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle invoice without seller phone', async () => {
    const dataWithoutPhone: InvoiceData = {
      ...validInvoiceData,
      seller: {
        name: validInvoiceData.seller.name,
        inn: validInvoiceData.seller.inn,
        kpp: validInvoiceData.seller.kpp,
        address: validInvoiceData.seller.address,
      },
    };

    const result = await generateInvoice(dataWithoutPhone);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle invoice without buyer KPP', async () => {
    const dataWithoutKpp: InvoiceData = {
      ...validInvoiceData,
      buyer: {
        name: validInvoiceData.buyer.name,
        inn: validInvoiceData.buyer.inn,
        address: validInvoiceData.buyer.address,
      },
    };

    const result = await generateInvoice(dataWithoutKpp);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle multiple items', async () => {
    const dataWithManyItems: InvoiceData = {
      ...validInvoiceData,
      items: [
        { name: 'Item 1', quantity: 1, price: 100, total: 100, vat: 0 },
        { name: 'Item 2', quantity: 2, price: 200, total: 400, vat: 0 },
        { name: 'Item 3', quantity: 3, price: 300, total: 900, vat: 0 },
      ],
      subtotal: 1400,
      total: 1400,
    };

    const result = await generateInvoice(dataWithManyItems);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(1024);
  });

  it('should handle zero VAT rate', async () => {
    const dataWithZeroVat: InvoiceData = {
      ...validInvoiceData,
      vatRate: 0,
      vatAmount: 0,
    };

    const result = await generateInvoice(dataWithZeroVat);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle high VAT rate', async () => {
    const dataWithHighVat: InvoiceData = {
      ...validInvoiceData,
      vatRate: 25,
      vatAmount: 2750,
    };

    const result = await generateInvoice(dataWithHighVat);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle large total amount', async () => {
    const dataWithLargeAmount: InvoiceData = {
      ...validInvoiceData,
      subtotal: 1000000,
      vatAmount: 200000,
      total: 1200000,
    };

    const result = await generateInvoice(dataWithLargeAmount);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle long payment terms string', async () => {
    const dataWithLongTerms: InvoiceData = {
      ...validInvoiceData,
      paymentTerms: '90 дней с момента получения счета',
    };

    const result = await generateInvoice(dataWithLongTerms);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should generate valid PDF structure', async () => {
    const result = await generateInvoice(validInvoiceData);

    expect(result[0]).toBe(0x25);
    expect(result[1]).toBe(0x50);
    expect(result[2]).toBe(0x44);
    expect(result[3]).toBe(0x46);
  });
});