package com.genesis.contact.model;

import lombok.*;
import org.springframework.lang.Nullable;

import javax.persistence.*;
import java.io.Serializable;

@Entity
@Setter
@Getter
@EqualsAndHashCode
@AllArgsConstructor
@ToString
@Table(name = "CONTACT")
public class Contact implements Serializable {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    @Column(name = "CONTACT_ID")
    private Long id;

    @Column(name = "CONTACT_FIRST_NAME")
    private String firstName;

    @Column(name = "CONTACT_LAST_NAME")
    private String lastName;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride( name = "street", column = @Column(name = "CONTACT_ADDRESS_STREET")),
            @AttributeOverride( name = "number", column = @Column(name = "CONTACT_ADDRESS_STREET_NUMBER")),
            @AttributeOverride( name = "postCode", column = @Column(name = "CONTACT_ADDRESS_POST_CODE")),
            @AttributeOverride( name = "locality", column = @Column(name = "CONTACT_ADDRESS_LOCALITY")),
            @AttributeOverride( name = "country", column = @Column(name = "CONTACT_ADDRESS_COUNTRY"))
    })
    private Address address;

    @Column(name = "CONTACT_TVA_NUMBER")
    @Nullable
    private String tvaNumber;

    public Contact() {}

}
