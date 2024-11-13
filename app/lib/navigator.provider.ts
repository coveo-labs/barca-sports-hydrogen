import type {NavigatorContext} from '@coveo/headless/ssr-commerce';
import {getCookie} from './session';
export class ServerSideNavigatorContextProvider implements NavigatorContext {
  private request: Request;
  constructor(request: Request) {
    this.request = request;
  }
  get referrer() {
    return this.request.referrer;
  }

  get userAgent() {
    return this.request.headers.get('user-agent');
  }

  get location() {
    return this.request.url;
  }

  get clientId() {
    let id = getCookie(this.request, 'coveo_visitorId');
    if (!id) {
      id = crypto.randomUUID();
    }
    return id;
  }

  get marshal(): NavigatorContext {
    return {
      clientId: this.clientId,
      location: this.location,
      referrer: this.referrer,
      userAgent: this.userAgent,
    };
  }
}

// TODO
export class ClientSideNavigatorContextProvider implements NavigatorContext {
  get referrer() {
    return document.referrer;
  }

  get userAgent() {
    return navigator.userAgent;
  }

  get location() {
    return window.location.href;
  }

  get clientId() {
    // TODO
    return 'asdasd';
  }

  get marshal(): NavigatorContext {
    return {
      clientId: this.clientId,
      location: this.location,
      referrer: this.referrer,
      userAgent: this.userAgent,
    };
  }
}
