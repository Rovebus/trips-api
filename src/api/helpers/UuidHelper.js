import { v4 as uuidv4 } from 'uuid';

export default class UuidHelper {
  static get newUuid() {
    return uuidv4();
  }
}
