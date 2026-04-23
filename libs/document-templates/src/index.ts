import { generate } from '@pdfme/generator';
import { mm2pt } from '@pdfme/signer';

export interface TTNData {
  number: string;
  date: string;
  sender: {
    name: string;
    address: string;
    inn: string;
    kpp?: string;
    phone?: string;
  };
  receiver: {
    name: string;
    address: string;
    inn: string;
    kpp?: string;
    phone?: string;
  };
  carrier: {
    name: string;
    address: string;
    inn: string;
    phone?: string;
  };
  driver: {
    name: string;
    license: string;
    phone?: string;
  };
  vehicle: {
    regNumber: string;
    type: string;
    capacity: string;
  };
  cargo: Array<{
    name: string;
    quantity: number;
    unit: string;
    weight: number;
    packaging: string;
  }>;
  totalWeight: number;
  totalQuantity: number;
  loadingAddress: string;
  unloadingAddress: string;
}

export async function generateTTN(data: TTNData): Promise<Uint8Array> {
  const template = {
    base: { format: 'A4', margin: [20, 10, 10, 10] },
    metadata: { creator: 'Logistics Optimizer', title: `ТТН ${data.number}` },
    sections: [
      {
        name: 'header',
        columnNames: ['col1'],
        body: [
          [{ label: 'ТОВАРНАЯ НАКЛАДНАЯ', fontSize: 18, fontWeight: 'bold', align: 'center' }],
          [{ label: ` № ${data.number}`, fontSize: 12, align: 'right' }],
          [{ label: `Дата: ${data.date}`, fontSize: 10 }],
        ],
      },
      {
        name: 'route',
        columnNames: ['col1'],
        body: [
          [{ label: `Откуда: ${data.loadingAddress}`, fontSize: 10 }],
          [{ label: `Куда: ${data.unloadingAddress}`, fontSize: 10 }],
        ],
      },
      {
        name: 'parties',
        columnNames: ['sender', 'carrier', 'receiver'],
        body: [
          [{ label: 'Грузоотправитель:', fontWeight: 'bold' }, { label: 'Перевозчик:', fontWeight: 'bold' }, { label: 'Грузополучатель:', fontWeight: 'bold' }],
          [{ label: data.sender.name }, { label: data.carrier.name }, { label: data.receiver.name }],
          [{ label: data.sender.address }, { label: data.carrier.address }, { label: data.receiver.address }],
          [{ label: `ИНН: ${data.sender.inn}`, label: `ИНН: ${data.carrier.inn}`, label: `ИНН: ${data.receiver.inn}` }],
        ],
      },
      {
        name: 'transport',
        columnNames: ['col1'],
        body: [
          [{ label: 'Транспорт:', fontWeight: 'bold' }],
          [{ label: `${data.vehicle.type} (${data.vehicle.regNumber}), ${data.vehicle.capacity}` }],
        ],
      },
      {
        name: 'driver',
        columnNames: ['col1'],
        body: [
          [{ label: 'Водитель:', fontWeight: 'bold' }],
          [{ label: `${data.driver.name}, вод. удостоверение: ${data.driver.license}` }],
        ],
      },
      {
        name: 'cargo',
        columnNames: ['name', 'quantity', 'unit', 'weight', 'packaging'],
        body: data.cargo.map(c => [
          { label: c.name },
          { label: c.quantity.toString() },
          { label: c.unit },
          { label: `${c.weight} кг` },
          { label: c.packaging },
        ]),
        footers: [
          [{ label: 'ИТОГО:', fontWeight: 'bold' }, { label: data.totalQuantity.toString(), fontWeight: 'bold' }, { label: '', label: `${data.totalWeight} кг`, fontWeight: 'bold' }, { label: '' }],
        ],
      },
      {
        name: 'signatures',
        columnNames: ['col1'],
        body: [
          [{ label: 'Отгрузил: ______________ / ${data.sender.name}/', fontSize: 9 }],
          [{ label: 'Принял: ______________ / ${data.receiver.name}/', fontSize: 9 }],
          [{ label: 'Перевез: ______________ / ${data.driver.name}/', fontSize: 9 }],
        ],
      },
    ],
  };

  return generate({ template, data });
}

export interface InvoiceData {
  number: string;
  date: string;
  dueDate: string;
  seller: {
    name: string;
    inn: string;
    kpp?: string;
    address: string;
    phone?: string;
  };
  buyer: {
    name: string;
    inn: string;
    kpp?: string;
    address: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    vat: number;
  }>;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paymentTerms: string;
}

export async function generateInvoice(data: InvoiceData): Promise<Uint8Array> {
  const template = {
    base: { format: 'A4', margin: [20, 10, 10, 10] },
    metadata: { creator: 'Logistics Optimizer', title: `Счёт ${data.number}` },
    sections: [
      {
        name: 'header',
        columnNames: ['col1'],
        body: [
          [{ label: 'СЧЁТ НА ОПЛАТУ', fontSize: 18, fontWeight: 'bold', align: 'center' }],
          [{ label: ` № ${data.number} от ${data.date}`, fontSize: 12, align: 'right' }],
        ],
      },
      {
        name: 'parties',
        columnNames: ['seller', 'buyer'],
        body: [
          [{ label: 'Продавец:', fontWeight: 'bold' }, { label: 'Покупатель:', fontWeight: 'bold' }],
          [{ label: data.seller.name }, { label: data.buyer.name }],
          [{ label: `ИНН ${data.seller.inn}`, label: `ИНН ${data.buyer.inn}` }],
          [{ label: data.seller.address }, { label: data.buyer.address }],
        ],
      },
      {
        name: 'items',
        columnNames: ['name', 'quantity', 'price', 'total'],
        body: data.items.map(item => [
          { label: item.name },
          { label: item.quantity.toString() },
          { label: `${item.price} ₽` },
          { label: `${item.total} ₽` },
        ]),
        footers: [
          [{ label: 'ИТОГО:', fontWeight: 'bold' }, { label: '', label: `${data.subtotal} ₽`, fontWeight: 'bold' }],
          [{ label: `НДС ${data.vatRate}%:`, label: '', label: `${data.vatAmount} ₽`, label: '' }],
          [{ label: 'К ОПЛАТЕ:', fontWeight: 'bold', fontSize: 12 }, { label: '', label: `${data.total} ₽`, fontWeight: 'bold', fontSize: 12 }],
        ],
      },
      {
        name: 'terms',
        columnNames: ['col1'],
        body: [
          [{ label: `Срок оплаты: ${data.paymentTerms}`, fontSize: 10 }],
          [{ label: `Оплатить до: ${data.dueDate}`, fontSize: 10 }],
        ],
      },
    ],
  };

  return generate({ template, data });
}

export interface AVRData {
  number: string;
  date: string;
  contractNumber: string;
  contractDate: string;
  customer: {
    name: string;
    inn: string;
    address: string;
    director: string;
  };
  executor: {
    name: string;
    inn: string;
    address: string;
    director: string;
  };
  works: Array<{
    name: string;
    unit: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

export async function generateAVR(data: AVRData): Promise<Uint8Array> {
  const template = {
    base: { format: 'A4', margin: [20, 10, 10, 10] },
    metadata: { creator: 'Logistics Optimizer', title: `Акт ${data.number}` },
    sections: [
      {
        name: 'header',
        columnNames: ['col1'],
        body: [
          [{ label: 'АКТ №', fontSize: 18, fontWeight: 'bold', align: 'center' }],
          [{ label: `${data.number} от ${data.date}`, fontSize: 12, align: 'right' }],
          [{ label: `к Договору № ${data.contractNumber} от ${data.contractDate}`, fontSize: 10 }],
        ],
      },
      {
        name: 'parties',
        columnNames: ['executor', 'customer'],
        body: [
          [{ label: 'Исполнитель:', fontWeight: 'bold' }, { label: 'Заказчик:', fontWeight: 'bold' }],
          [{ label: data.executor.name }, { label: data.customer.name }],
          [{ label: `ИНН ${data.executor.inn}`, label: `ИНН ${data.customer.inn}` }],
          [{ label: `Директор: ${data.executor.director}`, label: `Директор: ${data.customer.director}` }],
        ],
      },
      {
        name: 'works',
        columnNames: ['name', 'unit', 'quantity', 'price', 'total'],
        body: data.works.map(w => [
          { label: w.name },
          { label: w.unit },
          { label: w.quantity.toString() },
          { label: `${w.price} ₽` },
          { label: `${w.total} ₽` },
        ]),
        footers: [
          [{ label: 'ИТОГО:', fontWeight: 'bold' }, { label: '', label: '', label: '', label: `${data.subtotal} ₽`, fontWeight: 'bold' }],
          [{ label: `НДС ${data.vatRate}%:`, label: '', label: '', label: `${data.vatAmount} ₽`, label: '' }],
          [{ label: 'ВСЕГО:', fontWeight: 'bold', fontSize: 12 }, { label: '', label: '', label: `${data.total} ₽`, fontWeight: 'bold', fontSize: 12 }],
        ],
      },
      {
        name: 'acts',
        columnNames: ['col1'],
        body: [
          [{ label: 'Общая стоимость услуг: ' + data.total + ' ₽', fontSize: 11 }],
          [{ label: 'В т.ч. НДС ' + data.vatRate + '%: ' + data.vatAmount + ' ₽', fontSize: 10 }],
        ],
      },
      {
        name: 'signatures',
        columnNames: ['executor', 'customer'],
        body: [
          [{ label: 'Исполнитель:', fontWeight: 'bold' }, { label: 'Заказчик:', fontWeight: 'bold' }],
          [{ label: '________ / ' + data.executor.director, label: '________ / ' + data.customer.director }],
          [{ label: '', label: 'М.П.' }],
        ],
      },
    ],
  };

  return generate({ template, data });
}