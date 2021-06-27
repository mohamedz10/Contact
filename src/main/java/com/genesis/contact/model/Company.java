package com.genesis.contact.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Set;

@Entity
@Setter
@Getter
@EqualsAndHashCode
@ToString
@Table(name = "COMPANY")
public class Company implements Serializable {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    @Column(name = "COMPANY_ID")
    private Long id;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride( name = "street", column = @Column(name = "COMPANY_ADDRESS_STREET")),
            @AttributeOverride( name = "number", column = @Column(name = "COMPANY_ADDRESS_STREET_NUMBER")),
            @AttributeOverride( name = "postCode", column = @Column(name = "COMPANY_ADDRESS_POST_CODE")),
            @AttributeOverride( name = "locality", column = @Column(name = "COMPANY_ADDRESS_LOCALITY")),
            @AttributeOverride( name = "country", column = @Column(name = "COMPANY_ADDRESS_COUNTRY"))
    })
    private Address address;


    @Column(name = "COMPANY_NAME")
    private String name;

    @Column(name = "COMPANY_TVA_NUMBER")
    private String tvaNumber;

    @OneToMany
    private Set<Contact> contacts;

    public Company(){}
}
