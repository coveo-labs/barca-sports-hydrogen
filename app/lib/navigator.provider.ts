import type {NavigatorContext} from '@coveo/headless/ssr-commerce';
import {getCookie, getCookieFromRequest} from './session';
export class ServerSideNavigatorContextProvider implements NavigatorContext {
  private request: Request;
  private generatedId?: string;
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
    const idFromRequest = getCookieFromRequest(this.request, 'coveo_visitorId');
    if (idFromRequest) {
      return idFromRequest;
    }
    if (this.generatedId) {
      return this.generatedId;
    }
    const generated = crypto.randomUUID();
    this.generatedId = generated;
    return generated;
  }

  get marshal(): NavigatorContext {
    return {
      clientId: this.clientId,
      location: this.location,
      referrer: this.referrer,
      userAgent: this.userAgent,
    };
  }

  public getCookieHeader(id = this.clientId) {
    const oneYear = new Date(
      new Date().getTime() + 365 * 24 * 60 * 60 * 1000,
    ).toUTCString();
    return `coveo_visitorId=${id}; Path=/; Expires=${oneYear}; SameSite=Lax`;
  }
}

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
    return getCookie(document.cookie, 'coveo_visitorId') || 'MISSING';
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
