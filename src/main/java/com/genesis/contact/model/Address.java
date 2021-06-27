package com.genesis.contact.model;

import lombok.*;

import javax.persistence.Embeddable;
import java.io.Serializable;

@Setter
@Getter
@AllArgsConstructor
@EqualsAndHashCode
@ToString
@Embeddable
public class Address implements Serializable {

    private String street;
    private String number;
    private String postCode;
    private String locality;
    private String country;

    public Address() {}

}
