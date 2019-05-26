/*
 * Copyright (C) 2019 Axel Müller <axel.mueller@avanux.de>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

package de.avanux.smartapplianceenabler.http;

import de.avanux.smartapplianceenabler.util.ParentWithChild;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import java.text.MessageFormat;
import java.util.List;

@XmlAccessorType(XmlAccessType.FIELD)
public class HttpWrite {
    @XmlAttribute
    private String url;
    @XmlElement(name = "HttpWriteValue")
    private List<HttpWriteValue> writeValues;

    public HttpWrite() {
    }

    public HttpWrite(String url) {
        this.url = url;
    }

    public String getUrl() {
        return url;
    }

    public List<HttpWriteValue> getWriteValues() {
        return writeValues;
    }

    public void setWriteValues(List<HttpWriteValue> writeValues) {
        this.writeValues = writeValues;
    }

    public static ParentWithChild<HttpWrite,HttpWriteValue> getFirstHttpWrite(String valueName, List<HttpWrite> writes) {
        if(writes != null) {
            for(HttpWrite write: writes) {
                for(HttpWriteValue writeValue: write.getWriteValues()) {
                    if(writeValue.getName().equals(valueName)) {
                        return new ParentWithChild<>(write, writeValue);
                    }
                }
            }
        }
        return null;
    }

    public void writeValue(HttpTransactionExecutor executor, HttpWriteValue value, Object ... arguments) {
        String urlWithPlaceholder = buildUrl(this.url, value.getValue(), value.getMethod());
        String resolvedUrl = MessageFormat.format(urlWithPlaceholder, arguments);
        if(value.getMethod() == HttpMethod.GET) {
            String response = executor.executeGet(resolvedUrl);
        }
    }

    protected String buildUrl(String url, String value, HttpMethod httpMethod) {
        StringBuilder builder = new StringBuilder(url);
        if(httpMethod == HttpMethod.GET) {
            builder.append(value);
        }
        return builder.toString();
    }
}
