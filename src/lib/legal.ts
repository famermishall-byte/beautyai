// Реквизиты того, кто отвечает за данные покупателей, — для политики конфиденциальности (`/privacy`).
// Заполняет владелец магазина. Пока хоть одно поле пустое, страница показывает «не заполнено».
export const LEGAL = {
  /** Название магазина или ИП, как в документах. */
  operatorName: "Малдыбаева Мадина",
  /** Почта или телефон, по которым покупатель может обратиться по своим данным. */
  contact: "famermishall@gmail.com",
};

export function legalReady(legal: typeof LEGAL = LEGAL): boolean {
  return [legal.operatorName, legal.contact].every((v) => v.trim().length > 0);
}
