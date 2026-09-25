import { contact } from "../data/contact.js";

export function email() {
  return contact.emailParts.join("@");
}

export function phone() {
  return contact.phoneParts.join(" ");
}

export function phoneHref() {
  return `tel:${contact.phoneParts.join("")}`;
}
